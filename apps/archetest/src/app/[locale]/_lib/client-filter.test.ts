import { describe, expect, it } from 'vitest'
import { CLIENT_FILTER_DEFAULTS, type FilterableClient, filterClients } from './client-filter'

const c = (over: Partial<FilterableClient>): FilterableClient => ({
  clientName: 'Анна',
  clientEmail: 'anna@example.test',
  status: 'ACTIVE',
  createdAt: new Date('2026-09-10T12:00:00Z'),
  rankTier: 'NOVICE',
  ...over,
})
const LIST = [
  c({ clientName: 'Анна Петрова', clientEmail: 'anna@example.test' }),
  c({ clientName: 'boris@example.test', clientEmail: 'boris@example.test', status: 'REVOKED', rankTier: null }),
  c({
    clientName: 'Вера',
    clientEmail: 'vera@example.test',
    createdAt: new Date('2026-08-01T12:00:00Z'),
    rankTier: 'EXPLORER',
  }),
]

describe('filterClients', () => {
  it('дефолты не фильтруют ничего', () => {
    expect(filterClients(LIST, CLIENT_FILTER_DEFAULTS)).toHaveLength(3)
  })

  it('поиск — по имени и email, без учёта регистра и пробелов по краям', () => {
    expect(filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, search: '  ПЕТРОВА ' }).map((x) => x.clientEmail)).toEqual([
      'anna@example.test',
    ])
    expect(filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, search: 'vera@' })).toHaveLength(1)
  })

  it('статус связи', () => {
    expect(filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, status: 'REVOKED' }).map((x) => x.clientEmail)).toEqual([
      'boris@example.test',
    ])
  })

  it('дата привязки «с» (YYYY-MM-DD) включительно, по UTC-дню', () => {
    const got = filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, since: '2026-09-10' })
    expect(got.map((x) => x.clientEmail)).toEqual(['anna@example.test', 'boris@example.test'])
  })

  it('уровень ранга; у отозвавших доступ ранга нет — под фильтр по рангу они не попадают', () => {
    expect(filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, rankTier: 'EXPLORER' }).map((x) => x.clientEmail)).toEqual([
      'vera@example.test',
    ])
    expect(filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, rankTier: 'NOVICE' }).map((x) => x.clientEmail)).toEqual([
      'anna@example.test',
    ])
  })

  it('фильтры складываются по И', () => {
    expect(filterClients(LIST, { ...CLIENT_FILTER_DEFAULTS, status: 'ACTIVE', since: '2026-09-01', search: 'вера' }))
      .toEqual([])
  })
})
