/**
 * Скрипт для добавления товарищеских матчей
 * Запуск: bun apps/grandslamcup/scripts/add-friendly-matches.ts
 */
import { parsePostgresUrl } from '@letar/pg-url'
import { config } from 'dotenv'
import { join } from 'node:path'
import { Pool } from 'pg'

config({ path: join(import.meta.dirname, '../.env.local') })
config({ path: join(import.meta.dirname, '../.env') })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL не задан')
}

const pool = new Pool(parsePostgresUrl(process.env.DATABASE_URL))

async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const { rows } = await pool.query(sql, params)
  return rows as T[]
}

async function main() {
  // Активный сезон СПб
  const [season] = await query<{ id: string; name: string }>(
    `SELECT s.id, s.name FROM "Season" s JOIN "City" c ON s."cityId" = c.id WHERE s.status = 'ACTIVE' AND c.slug = 'spb' LIMIT 1`,
  )
  if (!season) {
    throw new Error('Нет активного сезона СПб')
  }
  console.log('Сезон:', season.name)

  // Команды
  const teams = await query<{ id: string; name: string }>(
    `SELECT id, name FROM "Team" WHERE name IN ('Пыжыки', 'ПЗК', 'Болт')`,
  )
  console.log('Команды:', teams.map((t) => t.name).join(', '))

  const teamId = (name: string) => teams.find((t) => t.name === name)?.id
  if (!teamId('Пыжыки') || !teamId('ПЗК') || !teamId('Болт')) {
    throw new Error('Не найдены команды')
  }

  // TeamSeason
  const teamSeasons = await query<{ id: string; teamid: string }>(
    `SELECT ts.id, ts."teamId" as teamid FROM "TeamSeason" ts WHERE ts."seasonId" = $1 AND ts."teamId" = ANY($2)`,
    [season.id, [teamId('Пыжыки'), teamId('ПЗК'), teamId('Болт')]],
  )
  const tsId = (tId: string) => teamSeasons.find((ts) => ts.teamid === tId)?.id
  if (!tsId(teamId('Пыжыки')!) || !tsId(teamId('ПЗК')!) || !tsId(teamId('Болт')!)) {
    throw new Error('Не найдены TeamSeason')
  }

  // Площадки
  const [glagol] = await query<{ id: string; name: string }>(
    `SELECT id, name FROM "Venue" WHERE name ILIKE '%Глагол%' LIMIT 1`,
  )
  const [fishFab] = await query<{ id: string; name: string }>(
    `SELECT id, name FROM "Venue" WHERE name ILIKE '%Fish%' LIMIT 1`,
  )
  console.log('Площадки:', glagol?.name, fishFab?.name)

  // Генерация CUID-подобных ID
  const cuid = () => {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).substring(2, 10)
    return `cm${ts}${rand}`
  }

  // Матч 1: Пыжыки vs ПЗК — 06.04.2026, 20:00, Глагол (товарищеский)
  await query(
    `INSERT INTO "Match" (id, "matchType", "homeTeamId", "awayTeamId", "seasonId", "venueId", "scheduledAt", status, "homeScore", "awayScore", "hasTiebreak", "scorerToken", "presenterToken", "homeCoachToken", "awayCoachToken", "createdAt", "updatedAt")
     VALUES ($1, 'FRIENDLY', $2, $3, $4, $5, $6, 'SCHEDULED', 0, 0, false, $7, $8, $9, $10, NOW(), NOW())`,
    [
      cuid(),
      tsId(teamId('Пыжыки')!),
      tsId(teamId('ПЗК')!),
      season.id,
      glagol?.id,
      '2026-04-06T17:00:00Z',
      cuid(),
      cuid(),
      cuid(),
      cuid(),
    ],
  )
  console.log('Матч 1 создан: Пыжыки vs ПЗК, 06.04, Глагол')

  // Матч 2: Болт vs ПЗК — 07.04.2026, 20:00, Fish bar Fabrique
  await query(
    `INSERT INTO "Match" (id, "matchType", "homeTeamId", "awayTeamId", "seasonId", "venueId", "scheduledAt", status, "homeScore", "awayScore", "hasTiebreak", "scorerToken", "presenterToken", "homeCoachToken", "awayCoachToken", "createdAt", "updatedAt")
     VALUES ($1, 'FRIENDLY', $2, $3, $4, $5, $6, 'SCHEDULED', 0, 0, false, $7, $8, $9, $10, NOW(), NOW())`,
    [
      cuid(),
      tsId(teamId('Болт')!),
      tsId(teamId('ПЗК')!),
      season.id,
      fishFab?.id,
      '2026-04-07T17:00:00Z',
      cuid(),
      cuid(),
      cuid(),
      cuid(),
    ],
  )
  console.log('Матч 2 создан: Болт vs ПЗК, 07.04, Fish bar Fabrique')
}

main()
  .catch(console.error)
  .finally(() => pool.end())
