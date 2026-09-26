/**
 * Проверка политик доступа с полем связи (`PolicyAddress`, `libs/forms/PLAN.md` §18.5): создание и правка адреса с городом
 * чужой страны. Печатает, что пропустила и что отклонила политика; за собой чистит данные.
 *
 * Запуск (нужна БД с применённой схемой): `DATABASE_URL=… npx tsx scripts/check-policy-relation-field.ts`
 */
import { ZenStackClient } from '@zenstackhq/orm'
import { PolicyPlugin } from '@zenstackhq/plugin-policy'
import { PostgresDialect } from 'kysely'
import { Pool } from 'pg'
import { schema } from '../src/generated/schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = new ZenStackClient(schema, { dialect: new PostgresDialect({ pool }) })
const authDb = db.$use(new PolicyPlugin())

async function attempt(label: string, fn: () => Promise<unknown>) {
  try {
    const r = await fn()
    console.log(`${label}: OK`, JSON.stringify(r))
  } catch (e) {
    const err = e as Error & { reason?: string }
    console.log(`${label}: REJECTED — ${err.constructor.name}: ${err.message.slice(0, 200)}`)
  }
}

async function main() {
  const ru = await db.policyCountry.create({ data: { name: 'Россия' } })
  const de = await db.policyCountry.create({ data: { name: 'Германия' } })
  const msk = await db.policyCity.create({ data: { name: 'Москва', countryId: ru.id } })
  const ber = await db.policyCity.create({ data: { name: 'Берлин', countryId: de.id } })

  await attempt(
    'create: город из выбранной страны (RU+Москва)',
    () => authDb.policyAddress.create({ data: { countryId: ru.id, cityId: msk.id } }),
  )
  await attempt(
    'create: город ЧУЖОЙ страны (RU+Берлин)',
    () => authDb.policyAddress.create({ data: { countryId: ru.id, cityId: ber.id } }),
  )

  const ok = await db.policyAddress.create({ data: { countryId: ru.id, cityId: msk.id } })
  await attempt(
    'update: сменить город на чужой (RU+Берлин)',
    () => authDb.policyAddress.update({ where: { id: ok.id }, data: { cityId: ber.id } }),
  )
  await attempt(
    'update: сменить только страну на DE, город остаётся московским',
    () => authDb.policyAddress.update({ where: { id: ok.id }, data: { countryId: de.id } }),
  )
  await attempt(
    'update: сменить обе (DE+Берлин)',
    () => authDb.policyAddress.update({ where: { id: ok.id }, data: { countryId: de.id, cityId: ber.id } }),
  )

  await db.policyAddress.deleteMany({})
  await db.policyCity.deleteMany({})
  await db.policyCountry.deleteMany({})
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
