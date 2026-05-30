import { afterEach, describe, expect, it, vi } from 'vitest'
import { type EmailFailureInfo, reportEmailFailure, setEmailFailureAlerter } from './failure-report'

afterEach(() => {
  setEmailFailureAlerter(null)
})

describe('reportEmailFailure', () => {
  const info: EmailFailureInfo = { type: 'verification', to: 'user@example.com', error: 'SMTP 550' }

  it('пишет структурную строку с type/to/error в console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    reportEmailFailure(info)

    expect(spy).toHaveBeenCalledOnce()
    const line = spy.mock.calls[0][0] as string
    expect(line).toContain('[email] send failed')
    expect(JSON.parse(line.replace('[email] send failed ', ''))).toEqual(info)
  })

  it('дёргает зарегистрированный алертер с info', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const alerter = vi.fn()
    setEmailFailureAlerter(alerter)

    reportEmailFailure(info)

    expect(alerter).toHaveBeenCalledWith(info)
  })

  it('не падает, если алертер бросает исключение', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    setEmailFailureAlerter(() => {
      throw new Error('boom')
    })

    expect(() => reportEmailFailure(info)).not.toThrow()
    // первый вызов — структурная строка, второй — лог исключения алертера
    expect(errSpy).toHaveBeenCalledTimes(2)
  })

  it('не дёргает алертер после сброса в null', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const alerter = vi.fn()
    setEmailFailureAlerter(alerter)
    setEmailFailureAlerter(null)

    reportEmailFailure(info)

    expect(alerter).not.toHaveBeenCalled()
  })
})
