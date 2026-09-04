import { describe, expect, it, vi } from 'vitest'
import { runDeletionSteps } from './run-deletion-steps'

describe('runDeletionSteps', () => {
  it('выполняет шаги последовательно, в заданном порядке', async () => {
    const order: string[] = []

    await runDeletionSteps([
      { name: 'отвязать заказы', run: async () => void order.push('отвязать заказы') },
      { name: 'обезличить профиль', run: async () => void order.push('обезличить профиль') },
    ])

    expect(order).toEqual(['отвязать заказы', 'обезличить профиль'])
  })

  it('возвращает ok:true для успешных шагов', async () => {
    const outcomes = await runDeletionSteps([{ name: 'шаг', run: async () => {} }])

    expect(outcomes).toEqual([{ name: 'шаг', ok: true }])
  })

  it('сбой шага не прерывает выполнение остальных', async () => {
    const secondRun = vi.fn(async () => {})

    const outcomes = await runDeletionSteps([
      {
        name: 'падает',
        run: async () => {
          throw new Error('нет прав')
        },
      },
      { name: 'выполняется', run: secondRun },
    ])

    expect(secondRun).toHaveBeenCalledOnce()
    expect(outcomes[0]?.ok).toBe(false)
    expect(outcomes[1]).toEqual({ name: 'выполняется', ok: true })
  })

  it('работает с пустым списком шагов', async () => {
    const outcomes = await runDeletionSteps([])

    expect(outcomes).toEqual([])
  })
})
