import type { AnalyticsAdapter, FormAnalyticsEvent } from '../types'

/** Адаптер для Яндекс Метрика (goals + params) */
export function createYandexMetrikaAdapter(counterId: number): AnalyticsAdapter {
  return {
    name: 'yandex-metrika',
    track(event: FormAnalyticsEvent, formId?: string) {
      const ym = (
        globalThis as { ym?: (id: number, action: string, goal: string, params?: Record<string, unknown>) => void }
      ).ym
      if (!ym) return

      const goalPrefix = formId ? `form_${formId}` : 'form'

      switch (event.type) {
        case 'field_focus':
          ym(counterId, 'reachGoal', `${goalPrefix}_field_focus`, { field: event.field })
          break
        case 'field_error':
          ym(counterId, 'reachGoal', `${goalPrefix}_field_error`, { field: event.field, error: event.error })
          break
        case 'form_abandon':
          ym(counterId, 'reachGoal', `${goalPrefix}_abandon`, {
            lastField: event.lastField,
            filledFields: event.filledFields,
            totalTimeMs: event.totalTimeMs,
          })
          break
        case 'form_complete':
          ym(counterId, 'reachGoal', `${goalPrefix}_complete`, { totalTimeMs: event.totalTimeMs })
          break
      }
    },
  }
}
