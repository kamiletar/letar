/**
 * Бенчмарк useFormAnalytics — overhead на обработку событий.
 * Запуск: vitest bench src/lib/analytics/analytics.bench.ts
 */

import { describe, test } from 'vitest'
import { createGtagAdapter } from './adapters/gtag'
import { createPostHogAdapter } from './adapters/posthog'
import { createUmamiAdapter } from './adapters/umami'
import { createYandexMetrikaAdapter } from './adapters/yandex-metrika'
import type { FormAnalyticsEvent } from './types'

const FOCUS_EVENT: FormAnalyticsEvent = { type: 'field_focus', field: 'email', timestamp: Date.now() }
const BLUR_EVENT: FormAnalyticsEvent = { type: 'field_blur', field: 'email', timestamp: Date.now(), timeSpentMs: 3500 }
const ERROR_EVENT: FormAnalyticsEvent = { type: 'field_error', field: 'email', error: 'Invalid', timestamp: Date.now() }
const ABANDON_EVENT: FormAnalyticsEvent = {
  type: 'form_abandon',
  lastField: 'password',
  filledFields: 3,
  totalFields: 5,
  timestamp: Date.now(),
  totalTimeMs: 15000,
}

describe('Adapter track() throughput (без глобального объекта — no-op)', () => {
  const umami = createUmamiAdapter()
  const ym = createYandexMetrikaAdapter(12345)
  const gtag = createGtagAdapter()
  const posthog = createPostHogAdapter()

  test('Umami focus event', async ({ bench }) => {
    await bench('Umami focus event', () => {
      umami.track(FOCUS_EVENT, 'form-1')
    }).run()
  })
  test('Umami blur event', async ({ bench }) => {
    await bench('Umami blur event', () => {
      umami.track(BLUR_EVENT, 'form-1')
    }).run()
  })
  test('Yandex Metrika abandon', async ({ bench }) => {
    await bench('Yandex Metrika abandon', () => {
      ym.track(ABANDON_EVENT, 'form-1')
    }).run()
  })
  test('GA4 error event', async ({ bench }) => {
    await bench('GA4 error event', () => {
      gtag.track(ERROR_EVENT, 'form-1')
    }).run()
  })
  test('PostHog abandon', async ({ bench }) => {
    await bench('PostHog abandon', () => {
      posthog.track(ABANDON_EVENT, 'form-1')
    }).run()
  })

  test('все 4 адаптера на 1 event', async ({ bench }) => {
    await bench('все 4 адаптера на 1 event', () => {
      umami.track(FOCUS_EVENT, 'form-1')
      ym.track(FOCUS_EVENT, 'form-1')
      gtag.track(FOCUS_EVENT, 'form-1')
      posthog.track(FOCUS_EVENT, 'form-1')
    }).run()
  })
})
