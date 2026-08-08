import { describe, expect, it } from 'vitest'
import { defaultLegState, isSpamMailbox, shouldSendAlert } from './email-canary'

/**
 * Регрессия §62: канарейка была красной 17 дней, и никто не узнал.
 *
 * Два независимых механизма молчания:
 * 1. Алерт слался ровно один раз (булев флаг `alerted`) и больше не повторялся никогда.
 * 2. Факт отправки не отличался от факта доставки — `postDashboardAlert` глотал ошибку,
 *    а состояние всё равно записывало «уже алертили».
 *
 * Плюс слепота внешней ноги: письма исправно доставлялись в Спам, а искали только в INBOX.
 */
describe('shouldSendAlert — повторные уведомления', () => {
  const failing = { configured: true, ok: false, latencyMs: null, error: 'таймаут' }
  const okResult = { configured: true, ok: true, latencyMs: 120, error: null }

  it('молчит, пока неудач меньше порога', () => {
    const state = { ...defaultLegState(), consecutiveFailures: 2 }
    expect(shouldSendAlert(state, failing, 3)).toBe(false)
  })

  it('алертит при первом пересечении порога', () => {
    const state = { ...defaultLegState(), consecutiveFailures: 3 }
    expect(shouldSendAlert(state, failing, 3)).toBe(true)
  })

  // Ядро регрессии: раньше здесь навсегда наступала тишина.
  it('повторяет алерт при удвоении числа неудач, а не молчит навсегда', () => {
    const alerted = { ...defaultLegState(), consecutiveFailures: 6, alertedAtFailures: 3, lastAlertDelivered: true }
    expect(shouldSendAlert(alerted, failing, 3)).toBe(true)
  })

  it('между удвоениями не спамит', () => {
    const alerted = { ...defaultLegState(), consecutiveFailures: 5, alertedAtFailures: 3, lastAlertDelivered: true }
    expect(shouldSendAlert(alerted, failing, 3)).toBe(false)
  })

  // Второй механизм молчания: «отправили» не значит «дошло».
  it('повторяет на каждом прогоне, пока прошлый алерт не доставлен', () => {
    const undelivered = {
      ...defaultLegState(),
      consecutiveFailures: 4,
      alertedAtFailures: 3,
      lastAlertDelivered: false,
    }
    expect(shouldSendAlert(undelivered, failing, 3)).toBe(true)
  })

  it('на успешной проверке не алертит', () => {
    const state = { ...defaultLegState(), consecutiveFailures: 0 }
    expect(shouldSendAlert(state, okResult, 3)).toBe(false)
  })

  it('несконфигурированную ногу не трогает', () => {
    const state = { ...defaultLegState(), consecutiveFailures: 99 }
    const unconfigured = { configured: false, ok: false, latencyMs: null, error: null }
    expect(shouldSendAlert(state, unconfigured, 3)).toBe(false)
  })
})

describe('isSpamMailbox — письмо дошло, но не туда', () => {
  it('узнаёт спам по special-use флагу независимо от языка имени', () => {
    expect(isSpamMailbox({ path: '[Gmail]/Спам', specialUse: '\\Junk' })).toBe(true)
  })

  it('узнаёт спам по имени, когда флага нет', () => {
    expect(isSpamMailbox({ path: 'Spam' })).toBe(true)
    expect(isSpamMailbox({ path: 'Junk' })).toBe(true)
    expect(isSpamMailbox({ path: '[Gmail]/Спам' })).toBe(true)
  })

  it('INBOX спамом не считает', () => {
    expect(isSpamMailbox({ path: 'INBOX', specialUse: '\\Inbox' })).toBe(false)
  })
})
