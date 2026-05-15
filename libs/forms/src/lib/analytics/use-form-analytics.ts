'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { FieldAnalytics, FormAnalyticsConfig, FormAnalyticsEvent, UseFormAnalyticsResult } from './types'

/**
 * useFormAnalytics — трекинг поведения пользователя в форме.
 *
 * Отслеживает: focus/blur по полям, время на каждом поле, ошибки,
 * возвраты (corrections), процент заполнения, abandon/complete.
 */
export function useFormAnalytics(config?: FormAnalyticsConfig): UseFormAnalyticsResult {
  const { enabled = true, formId, adapters = [], trackCorrections = true } = config ?? {}

  const [fieldAnalytics, setFieldAnalytics] = useState<Map<string, FieldAnalytics>>(new Map())
  const [lastFocusedField, setLastFocusedField] = useState<string | null>(null)
  const startTimeRef = useRef(Date.now())
  const focusTimeRef = useRef<Map<string, number>>(new Map())
  const blurredFieldsRef = useRef<Set<string>>(new Set())

  // Отправить событие во все адаптеры + callbacks
  const emit = useCallback(
    (event: FormAnalyticsEvent) => {
      if (!enabled) return
      for (const adapter of adapters) {
        try {
          adapter.track(event, formId)
        } catch {}
      }
      // Callbacks
      switch (event.type) {
        case 'field_focus':
          config?.onFieldFocus?.(event.field, event.timestamp)
          break
        case 'field_blur':
          config?.onFieldBlur?.(event.field, event.timestamp, event.timeSpentMs)
          break
        case 'field_error':
          config?.onFieldError?.(event.field, event.error)
          break
        case 'step_change':
          config?.onStepChange?.(event.from, event.to)
          break
        case 'form_abandon':
          config?.onAbandon?.(event.lastField, event.filledFields, event.totalFields)
          break
        case 'form_complete':
          config?.onComplete?.(event.totalTimeMs, event.fieldTimes)
          break
      }
    },
    [enabled, adapters, formId, config]
  )

  // Инициализация адаптеров
  useEffect(() => {
    if (!enabled) return
    for (const adapter of adapters) {
      try {
        adapter.init?.()
      } catch {}
    }
    return () => {
      for (const adapter of adapters) {
        try {
          adapter.destroy?.()
        } catch {}
      }
    }
  }, [enabled, adapters])

  // Трекинг focus на поле
  const trackFocus = useCallback(
    (field: string) => {
      if (!enabled) return
      const now = Date.now()
      focusTimeRef.current.set(field, now)
      setLastFocusedField(field)

      setFieldAnalytics((prev) => {
        const next = new Map(prev)
        const existing = next.get(field) ?? createEmptyAnalytics()
        const isCorrection = trackCorrections && blurredFieldsRef.current.has(field)
        next.set(field, {
          ...existing,
          focusCount: existing.focusCount + 1,
          firstFocusAt: existing.firstFocusAt ?? now,
          correctionCount: existing.correctionCount + (isCorrection ? 1 : 0),
        })
        return next
      })

      emit({ type: 'field_focus', field, timestamp: now })
      if (trackCorrections && blurredFieldsRef.current.has(field)) {
        const analytics = fieldAnalytics.get(field)
        emit({
          type: 'field_correction',
          field,
          timestamp: now,
          correctionCount: (analytics?.correctionCount ?? 0) + 1,
        })
      }
    },
    [enabled, trackCorrections, fieldAnalytics, emit]
  )

  // Трекинг blur
  const trackBlur = useCallback(
    (field: string) => {
      if (!enabled) return
      const now = Date.now()
      const focusTime = focusTimeRef.current.get(field)
      const timeSpentMs = focusTime ? now - focusTime : 0
      blurredFieldsRef.current.add(field)

      setFieldAnalytics((prev) => {
        const next = new Map(prev)
        const existing = next.get(field) ?? createEmptyAnalytics()
        next.set(field, { ...existing, totalTimeMs: existing.totalTimeMs + timeSpentMs, lastBlurAt: now })
        return next
      })

      emit({ type: 'field_blur', field, timestamp: now, timeSpentMs })
    },
    [enabled, emit]
  )

  // Трекинг ошибки
  const trackError = useCallback(
    (field: string, error: string) => {
      if (!enabled) return
      setFieldAnalytics((prev) => {
        const next = new Map(prev)
        const existing = next.get(field) ?? createEmptyAnalytics()
        next.set(field, { ...existing, errorCount: existing.errorCount + 1 })
        return next
      })
      emit({ type: 'field_error', field, error, timestamp: Date.now() })
    },
    [enabled, emit]
  )

  // Глобальный перехват focus/blur на инпутах формы
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const name = target.getAttribute('name')
      if (name) trackFocus(name)
    }
    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement
      const name = target.getAttribute('name')
      if (name) trackBlur(name)
    }
    document.addEventListener('focusin', handleFocus, true)
    document.addEventListener('focusout', handleBlur, true)
    return () => {
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('focusout', handleBlur, true)
    }
  }, [enabled, trackFocus, trackBlur])

  // Трекинг abandon при уходе со страницы
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    const handleBeforeUnload = () => {
      if (lastFocusedField && fieldAnalytics.size > 0) {
        emit({
          type: 'form_abandon',
          lastField: lastFocusedField,
          filledFields: fieldAnalytics.size,
          totalFields: fieldAnalytics.size, // приблизительно
          timestamp: Date.now(),
          totalTimeMs: Date.now() - startTimeRef.current,
        })
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [enabled, lastFocusedField, fieldAnalytics, emit])

  const totalTimeMs = Date.now() - startTimeRef.current
  const totalErrors = Array.from(fieldAnalytics.values()).reduce((sum, fa) => sum + fa.errorCount, 0)
  // Completion = поля с blur / общее количество полей с хотя бы одним фокусом
  const fieldsWithBlur = Array.from(fieldAnalytics.values()).filter((fa) => fa.lastBlurAt !== null).length
  const totalFieldsTracked = fieldAnalytics.size || 1
  const completionRate = Math.round((fieldsWithBlur / totalFieldsTracked) * 100)

  const trackAbandon = useCallback(() => {
    emit({
      type: 'form_abandon',
      lastField: lastFocusedField ?? '',
      filledFields: fieldsWithBlur,
      totalFields: totalFieldsTracked,
      timestamp: Date.now(),
      totalTimeMs: Date.now() - startTimeRef.current,
    })
  }, [lastFocusedField, fieldsWithBlur, totalFieldsTracked, emit])

  const trackComplete = useCallback(() => {
    emit({
      type: 'form_complete',
      totalTimeMs: Date.now() - startTimeRef.current,
      fieldTimes: fieldAnalytics,
      timestamp: Date.now(),
    })
  }, [fieldAnalytics, emit])

  const reset = useCallback(() => {
    setFieldAnalytics(new Map())
    setLastFocusedField(null)
    focusTimeRef.current.clear()
    blurredFieldsRef.current.clear()
    startTimeRef.current = Date.now()
  }, [])

  return {
    fieldAnalytics,
    completionRate,
    lastFocusedField,
    totalTimeMs,
    totalErrors,
    trackError,
    trackAbandon,
    trackComplete,
    reset,
  }
}

function createEmptyAnalytics(): FieldAnalytics {
  return { focusCount: 0, totalTimeMs: 0, errorCount: 0, correctionCount: 0, firstFocusAt: null, lastBlurAt: null }
}
