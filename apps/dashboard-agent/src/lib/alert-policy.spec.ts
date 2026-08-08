import { describe, expect, it } from 'vitest'
import { defaultAlertRepeatState, shouldRepeatAlert } from './alert-policy'

/**
 * Формула повтора алертов, вынесенная из email-canary.ts при переносе той же логики
 * в backup-freshness.ts (§62 PLAN-INFRA.md). Сама регрессия (17 дней тишины) детально
 * разобрана в email-canary.spec.ts — здесь только сама формула в отрыве от конкретного
 * потребителя.
 */
describe('shouldRepeatAlert', () => {
  it('молчит, пока счётчик меньше порога', () => {
    expect(shouldRepeatAlert(defaultAlertRepeatState(), 2, 3)).toBe(false)
  })

  it('алертит при первом пересечении порога', () => {
    expect(shouldRepeatAlert(defaultAlertRepeatState(), 3, 3)).toBe(true)
  })

  it('повторяет при удвоении счётчика, а не молчит навсегда', () => {
    const state = { alertedAtCount: 3, lastAlertDelivered: true }
    expect(shouldRepeatAlert(state, 6, 3)).toBe(true)
  })

  it('между удвоениями не спамит', () => {
    const state = { alertedAtCount: 3, lastAlertDelivered: true }
    expect(shouldRepeatAlert(state, 5, 3)).toBe(false)
  })

  it('повторяет на каждом прогоне, пока прошлый алерт не доставлен', () => {
    const state = { alertedAtCount: 3, lastAlertDelivered: false }
    expect(shouldRepeatAlert(state, 4, 3)).toBe(true)
  })
})
