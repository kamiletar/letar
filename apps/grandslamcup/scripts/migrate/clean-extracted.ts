/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Чистка AI-экстрагированных JSON файлов.
 * Нормализация имён команд, фильтрация мусора, унификация полей.
 *
 * Запуск: bun run scripts/migrate/clean-extracted.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const DATA_DIR = join(import.meta.dirname, 'manual-data')

// ============================================
// Белые списки команд
// ============================================

/** СПб Сезон 1 (июль-дек 2024) — 12 команд */
const SPB_S1_TEAMS = [
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
]

/** СПб Сезон 2 (дек 2024 - май 2025) — 16 команд, 2 лиги */
const SPB_S2_TEAMS = [
  'Чумные',
  'Блины',
  'Или',
  'ПЗК',
  'Обормоты',
  'Менестрели подземелья',
  '1163',
  'Вином',
  'Бугульма',
  'Пыжыки',
  'Винета',
  'Бюро',
  'Болт',
  'Состав',
  'Апостроф',
  'Веселые ребята',
]

/** СПб Сезон 3 (сент 2025 - ...) — команды */
const SPB_S3_TEAMS = [
  'Чумные',
  'Обормоты',
  'Или',
  'ПЗК',
  'Менестрели подземелья',
  '1163',
  'Вином',
  'Бугульма',
  'Пыжыки',
  'Винета',
  'Бюро',
  'Болт',
  'Состав',
  'Апостроф',
  'Веселые ребята',
  'Блины',
  'Синий Пушкин',
  'СТИХИ НАРОДА',
  'ДА',
]

/** Москва Сезон 1 (февр-дек 2025) — 12 команд */
const MOSCOW_S1_TEAMS = [
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
]

/** Москва Сезон 2 (февр 2026 - ...) — 16 команд */
const MOSCOW_S2_TEAMS = [
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
]

/** Все допустимые команды (объединение) */
const ALL_TEAMS = new Set([...SPB_S1_TEAMS, ...SPB_S2_TEAMS, ...SPB_S3_TEAMS, ...MOSCOW_S1_TEAMS, ...MOSCOW_S2_TEAMS])

// ============================================
// Нормализация
// ============================================

/** Маппинг алиасов → каноническое имя */
const TEAM_ALIASES: Record<string, string> = {
  // Регистр
  БЛИНЫ: 'Блины',
  ОБОРМОТЫ: 'Обормоты',
  ЧУМНЫЕ: 'Чумные',
  ИЛИ: 'Или',
  БУГУЛЬМА: 'Бугульма',
  ШАТУНЫ: 'Шатуны',
  // Сокращения
  Менестрели: 'Менестрели подземелья',
  'Менестрели Подземелья': 'Менестрели подземелья',
  'Команда 1163': '1163',
  'Стихи народа': 'СТИХИ НАРОДА',
  'Стихи Народа': 'СТИХИ НАРОДА',
  // Ёе
  'Весёлые ребята': 'Веселые ребята',
}

function normalizeTeamName(name: string): string | null {
  const trimmed = name.trim()

  // Проверяем алиас
  if (TEAM_ALIASES[trimmed]) {
    return TEAM_ALIASES[trimmed]
  }

  // Проверяем белый список
  if (ALL_TEAMS.has(trimmed)) {
    return trimmed
  }

  // Пробуем без учёта регистра
  for (const team of ALL_TEAMS) {
    if (team.toLowerCase() === trimmed.toLowerCase()) {
      return team
    }
  }

  // Мусор — отбрасываем
  return null
}

// ============================================
// Чистка
// ============================================

interface ExtractedData {
  matches: any[]
  rosters: any[]
  profiles: any[]
  venues: any[]
  rounds: any[]
  teams: any[]
}

function cleanData(data: ExtractedData, city: string): ExtractedData {
  const cleaned: ExtractedData = {
    matches: [],
    rosters: [],
    profiles: [],
    venues: [],
    rounds: [],
    teams: [],
  }

  // Чистка матчей — принимаем даже если нет home/away (есть winner+score)
  for (const m of data.matches) {
    const home = normalizeTeamName(m.home || m.team1 || '') || null
    const away = normalizeTeamName(m.away || m.team2 || '') || null
    const winner = normalizeTeamName(m.winner || '') || null

    // Нужен хотя бы один из: home+away или winner+score
    if (!home && !away && !winner) {
      continue
    }

    // Парсинг score
    let homeScore: number | null = null
    let awayScore: number | null = null
    if (m.score && typeof m.score === 'string') {
      const parts = m.score.replace(/[:\s]/g, '-').split('-').map(Number)
      if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        homeScore = parts[0]
        awayScore = parts[1]
      }
    } else if (m.score && typeof m.score === 'object') {
      homeScore = m.score.home ?? m.score.team1 ?? null
      awayScore = m.score.away ?? m.score.team2 ?? null
    }

    cleaned.matches.push({
      msgId: m.msgId,
      date: m.date?.substring(0, 10),
      home,
      away,
      venue: m.venue || null,
      address: m.address || null,
      time: m.time || null,
      homeScore,
      awayScore,
      winner,
    })
  }

  // Чистка составов
  for (const r of data.rosters) {
    const team = normalizeTeamName(r.team || '')
    if (!team) {
      continue
    }

    const players = (r.players || r.members || [])
      .map((p: string) => p.trim())
      .filter((p: string) => p.length >= 2 && !p.startsWith('#') && !p.startsWith('http'))

    if (players.length === 0) {
      continue
    }

    cleaned.rosters.push({
      msgId: r.msgId,
      date: r.date?.substring(0, 10),
      team,
      players,
    })
  }

  // Чистка профилей
  for (const p of data.profiles) {
    let name = (p.name || '').trim()
    // Убираем мусор типа "Москве\n\nВладимир Красноруженко"
    if (name.includes('\n')) {
      const parts = name.split('\n').filter((s: string) => s.trim())
      name = parts[parts.length - 1].trim()
    }
    if (name.length < 3) {
      continue
    }

    const team = normalizeTeamName(p.team || '') || p.team || null

    cleaned.profiles.push({
      msgId: p.msgId,
      name,
      role: p.role || null,
      team,
      bio: (p.bio || p.description || '').substring(0, 500),
    })
  }

  // Чистка площадок
  for (const v of data.venues) {
    const name = (v.name || '').trim()
    if (name.length < 2) {
      continue
    }
    // Фильтруем мусор (длинные строки, предложения)
    if (name.length > 50) {
      continue
    }

    cleaned.venues.push({
      name,
      address: (v.address || '').trim() || null,
      type: v.type || null,
      city,
    })
  }

  // Чистка команд
  for (const t of data.teams) {
    const name = normalizeTeamName(t.name || '')
    if (!name) {
      continue
    }

    cleaned.teams.push({
      name,
      telegramUrl: t.telegramUrl || null,
      homeVenue: t.homeVenue || null,
    })
  }

  // Rounds — проброс как есть (если есть)
  cleaned.rounds = data.rounds || []

  return cleaned
}

// ============================================
// Main
// ============================================

function main() {
  console.log('=== Чистка AI-экстрагированных данных ===\n')

  // Москва
  const moscowRaw: ExtractedData = JSON.parse(readFileSync(join(DATA_DIR, 'moscow-ai-extracted.json'), 'utf-8'))
  const moscow = cleanData(moscowRaw, 'Москва')
  writeFileSync(join(DATA_DIR, 'moscow-clean.json'), JSON.stringify(moscow, null, 2), 'utf-8')

  console.log('Москва:')
  console.log(`  Матчей: ${moscowRaw.matches.length} → ${moscow.matches.length}`)
  console.log(`  Составов: ${moscowRaw.rosters.length} → ${moscow.rosters.length}`)
  console.log(`  Профилей: ${moscowRaw.profiles.length} → ${moscow.profiles.length}`)
  console.log(`  Площадок: ${moscowRaw.venues.length} → ${moscow.venues.length}`)
  console.log(`  Команд: ${moscowRaw.teams.length} → ${moscow.teams.length}`)

  // Уникальные игроки
  const mPlayers = new Set<string>()
  moscow.rosters.forEach((r) => r.players.forEach((p: string) => mPlayers.add(p)))
  console.log(`  Уникальных игроков: ${mPlayers.size}`)

  // СПб
  const spbRaw: ExtractedData = JSON.parse(readFileSync(join(DATA_DIR, 'spb-ai-extracted.json'), 'utf-8'))
  const spb = cleanData(spbRaw, 'Санкт-Петербург')
  writeFileSync(join(DATA_DIR, 'spb-clean.json'), JSON.stringify(spb, null, 2), 'utf-8')

  console.log('\nСПб:')
  console.log(`  Матчей: ${spbRaw.matches.length} → ${spb.matches.length}`)
  console.log(`  Составов: ${spbRaw.rosters.length} → ${spb.rosters.length}`)
  console.log(`  Профилей: ${spbRaw.profiles.length} → ${spb.profiles.length}`)
  console.log(`  Площадок: ${spbRaw.venues.length} → ${spb.venues.length}`)
  console.log(`  Команд: ${spbRaw.teams.length} → ${spb.teams.length}`)

  const sPlayers = new Set<string>()
  spb.rosters.forEach((r) => r.players.forEach((p: string) => sPlayers.add(p)))
  console.log(`  Уникальных игроков: ${sPlayers.size}`)

  // Итого
  console.log('\n=== ИТОГО ===')
  console.log(`  Матчей: ${moscow.matches.length + spb.matches.length}`)
  console.log(`  Игроков: ${mPlayers.size + sPlayers.size} (с возможными пересечениями)`)
  console.log(`  Площадок: ${moscow.venues.length + spb.venues.length}`)
}

main()
