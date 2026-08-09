/**
 * Бенчмарк mapServerErrors — скорость парсинга разных форматов.
 * Запуск: vitest bench src/lib/server-errors/map-server-errors.bench.ts
 */

import { bench, describe } from 'vitest'
import { mapServerErrors } from './map-server-errors'

const PRISMA_P2002 = { code: 'P2002', message: 'Unique constraint failed', meta: { target: ['email'] } }
const PRISMA_P2003 = { code: 'P2003', message: 'FK failed', meta: { field_name: 'categoryId' } }
const ZENSTACK_POLICY = { reason: 'rejected-by-policy' }
const ZENSTACK_DB = { reason: 'db-query-error', code: 'P2002', meta: { target: ['email'] } }
const ZOD_FLATTEN = { formErrors: ['Error'], fieldErrors: { email: ['Invalid'], password: ['Too short'] } }
const ACTION_RESULT = { success: false, error: 'Something went wrong' }
const FIELD_MAP = {
  email: { field: 'email', message: 'Already registered' },
  organizationId_name: { field: 'name', message: 'Name taken' },
}

describe('mapServerErrors throughput', () => {
  bench('Prisma P2002 (автодетект)', () => {
    mapServerErrors(PRISMA_P2002, { fieldMap: FIELD_MAP })
  })

  bench('Prisma P2003 (автодетект)', () => {
    mapServerErrors(PRISMA_P2003)
  })

  bench('ZenStack policy (автодетект)', () => {
    mapServerErrors(ZENSTACK_POLICY)
  })

  bench('ZenStack db-query → Prisma (автодетект)', () => {
    mapServerErrors(ZENSTACK_DB, { fieldMap: FIELD_MAP })
  })

  bench('Zod flatten (автодетект)', () => {
    mapServerErrors(ZOD_FLATTEN)
  })

  bench('ActionResult string (автодетект)', () => {
    mapServerErrors(ACTION_RESULT)
  })

  bench('null fallback', () => {
    mapServerErrors(null)
  })

  bench('Prisma P2002 (format: prisma)', () => {
    mapServerErrors(PRISMA_P2002, { format: 'prisma', fieldMap: FIELD_MAP })
  })
})
