import { describe, expect, it, vi } from 'vitest'
import { publishMentorEvent, subscribeMentorEvents } from './event-bus'

describe('event-bus', () => {
  it('доставляет опубликованное событие подписчику', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeMentorEvents(listener)
    publishMentorEvent({ kind: 'dim_all' })
    expect(listener).toHaveBeenCalledWith({ kind: 'dim_all' })
    unsubscribe()
  })

  it('после unsubscribe события не приходят', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeMentorEvents(listener)
    unsubscribe()
    publishMentorEvent({ kind: 'dim_all' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('доставляет событие нескольким подписчикам', () => {
    const a = vi.fn()
    const b = vi.fn()
    const unsubA = subscribeMentorEvents(a)
    const unsubB = subscribeMentorEvents(b)
    publishMentorEvent({ kind: 'focus_section', section: 'midi' })
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
    unsubA()
    unsubB()
  })
})
