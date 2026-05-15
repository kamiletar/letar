import { describe, expect, it, vi } from 'vitest'
import { createGtagAdapter } from './adapters/gtag'
import { createPostHogAdapter } from './adapters/posthog'
import { createUmamiAdapter } from './adapters/umami'
import { createYandexMetrikaAdapter } from './adapters/yandex-metrika'

describe('Analytics adapters', () => {
  describe('createUmamiAdapter', () => {
    it('возвращает адаптер с именем umami', () => {
      const adapter = createUmamiAdapter()
      expect(adapter.name).toBe('umami')
    })

    it('track не бросает если umami не загружен', () => {
      const adapter = createUmamiAdapter()
      expect(() => adapter.track({ type: 'field_focus', field: 'email', timestamp: Date.now() })).not.toThrow()
    })

    it('вызывает umami.track если доступен', () => {
      const mockTrack = vi.fn()
      ;(globalThis as Record<string, unknown>).umami = { track: mockTrack }
      const adapter = createUmamiAdapter()
      adapter.track({ type: 'field_focus', field: 'email', timestamp: Date.now() }, 'contact-form')
      expect(mockTrack).toHaveBeenCalledWith('form_field_focus', { formId: 'contact-form', field: 'email' })
      delete (globalThis as Record<string, unknown>).umami
    })
  })

  describe('createYandexMetrikaAdapter', () => {
    it('возвращает адаптер с именем yandex-metrika', () => {
      expect(createYandexMetrikaAdapter(12345).name).toBe('yandex-metrika')
    })

    it('вызывает ym reachGoal при abandon', () => {
      const mockYm = vi.fn()
      ;(globalThis as Record<string, unknown>).ym = mockYm
      const adapter = createYandexMetrikaAdapter(12345)
      adapter.track(
        {
          type: 'form_abandon',
          lastField: 'password',
          filledFields: 3,
          totalFields: 5,
          timestamp: Date.now(),
          totalTimeMs: 15000,
        },
        'register'
      )
      expect(mockYm).toHaveBeenCalledWith(
        12345,
        'reachGoal',
        'form_register_abandon',
        expect.objectContaining({ lastField: 'password' })
      )
      delete (globalThis as Record<string, unknown>).ym
    })
  })

  describe('createGtagAdapter', () => {
    it('возвращает адаптер с именем gtag', () => {
      expect(createGtagAdapter().name).toBe('gtag')
    })

    it('вызывает gtag event при complete', () => {
      const mockGtag = vi.fn()
      ;(globalThis as Record<string, unknown>).gtag = mockGtag
      const adapter = createGtagAdapter()
      adapter.track(
        { type: 'form_complete', totalTimeMs: 30000, fieldTimes: new Map(), timestamp: Date.now() },
        'checkout'
      )
      expect(mockGtag).toHaveBeenCalledWith('event', 'form_complete', expect.objectContaining({ form_id: 'checkout' }))
      delete (globalThis as Record<string, unknown>).gtag
    })
  })

  describe('createPostHogAdapter', () => {
    it('возвращает адаптер с именем posthog', () => {
      expect(createPostHogAdapter().name).toBe('posthog')
    })

    it('вызывает posthog.capture', () => {
      const mockCapture = vi.fn()
      ;(globalThis as Record<string, unknown>).posthog = { capture: mockCapture }
      const adapter = createPostHogAdapter()
      adapter.track({ type: 'field_error', field: 'email', error: 'Invalid', timestamp: Date.now() })
      expect(mockCapture).toHaveBeenCalledWith(
        'form_field_error',
        expect.objectContaining({ field: 'email', error: 'Invalid' })
      )
      delete (globalThis as Record<string, unknown>).posthog
    })
  })
})
