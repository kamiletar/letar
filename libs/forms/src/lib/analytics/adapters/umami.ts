import type { AnalyticsAdapter, FormAnalyticsEvent } from '../types'

/** Адаптер для Umami Analytics (umami.is) */
export function createUmamiAdapter(options?: { websiteId?: string }): AnalyticsAdapter {
  return {
    name: 'umami',
    track(event: FormAnalyticsEvent, formId?: string) {
      const umami = (globalThis as { umami?: { track: (name: string, data: Record<string, unknown>) => void } }).umami
      if (!umami) return

      const eventName = `form_${event.type}`
      const data: Record<string, unknown> = { formId, ...('field' in event ? { field: event.field } : {}) }

      if (event.type === 'field_blur') data.timeSpentMs = event.timeSpentMs
      if (event.type === 'field_error') data.error = event.error
      if (event.type === 'form_abandon') {
        data.lastField = event.lastField
        data.filledFields = event.filledFields
        data.totalTimeMs = event.totalTimeMs
      }
      if (event.type === 'form_complete') data.totalTimeMs = event.totalTimeMs

      umami.track(eventName, data)
    },
  }
}
