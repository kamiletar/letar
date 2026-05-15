import type { AnalyticsAdapter, FormAnalyticsEvent } from '../types'

/** Адаптер для PostHog */
export function createPostHogAdapter(): AnalyticsAdapter {
  return {
    name: 'posthog',
    track(event: FormAnalyticsEvent, formId?: string) {
      const posthog = (globalThis as { posthog?: { capture: (name: string, props: Record<string, unknown>) => void } })
        .posthog
      if (!posthog) return

      const props: Record<string, unknown> = { form_id: formId, event_type: event.type }
      if ('field' in event) props.field = event.field
      if (event.type === 'field_blur') props.time_spent_ms = event.timeSpentMs
      if (event.type === 'field_error') props.error = event.error
      if (event.type === 'form_abandon') {
        props.last_field = event.lastField
        props.filled_fields = event.filledFields
        props.total_time_ms = event.totalTimeMs
      }
      if (event.type === 'form_complete') props.total_time_ms = event.totalTimeMs

      posthog.capture(`form_${event.type}`, props)
    },
  }
}
