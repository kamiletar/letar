import { describe, expect, it } from 'vitest'
import { collectDataExport } from './collect-data-export'

describe('collectDataExport', () => {
  it('собирает результаты всех коллекторов в один бандл', async () => {
    const bundle = await collectDataExport({
      profile: async () => ({ name: 'Ками' }),
      orders: async () => [{ id: '1' }, { id: '2' }],
    })

    expect(bundle.data.profile).toEqual({ ok: true, value: { name: 'Ками' } })
    expect(bundle.data.orders).toEqual({ ok: true, value: [{ id: '1' }, { id: '2' }] })
    expect(bundle.generatedAt).toBeInstanceOf(Date)
  })

  it('сбой одного коллектора не обнуляет остальные', async () => {
    const bundle = await collectDataExport({
      profile: async () => ({ name: 'Ками' }),
      broken: async () => {
        throw new Error('источник недоступен')
      },
    })

    expect(bundle.data.profile).toEqual({ ok: true, value: { name: 'Ками' } })
    expect(bundle.data.broken.ok).toBe(false)
    if (!bundle.data.broken.ok) {
      expect(bundle.data.broken.error).toBeInstanceOf(Error)
    }
  })

  it('работает с пустым набором коллекторов', async () => {
    const bundle = await collectDataExport({})

    expect(bundle.data).toEqual({})
  })
})
