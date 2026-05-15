import type { AnalyticsAdapter, FormAnalyticsEvent } from '../types'

/** Адаптер для Google Analytics 4 (gtag) */
export function createGtagAdapter(): AnalyticsAdapter {
  return {
    name: 'gtag',
    track(event: FormAnalyticsEvent, formId?: string) {
      const gtag = (globalThis as { gtag?: (...args: unknown[]) => void }).gtag
      if (!gtag) return

      const params: Record<string, unknown> = { form_id: formId }
      if ('field' in event) params.field_name = event.field

      switch (event.type) {
        case 'field_blur':
          gtag('event', 'form_field_interaction', { ...params, time_spent_ms: event.timeSpentMs })
          break
        case 'field_error':
          gtag('event', 'form_field_error', { ...params, error_message: event.error })
          break
        case 'form_abandon':
          gtag('event', 'form_abandon', {
            ...params,
            last_field: event.lastField,
            filled_fields: event.filledFields,
            total_time_ms: event.totalTimeMs,
          })
          break
        case 'form_complete':
          gtag('event', 'form_complete', { ...params, total_time_ms: event.totalTimeMs })
          break
      }
    },
  }
}
