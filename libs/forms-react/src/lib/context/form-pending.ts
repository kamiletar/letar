'use client'

import { createPendingRegistry, type PendingRegistry, type PendingRegistrySnapshot } from '@letar/forms-core/uikit'
import { useCallback, useState, useSyncExternalStore } from 'react'
import type { AppFormApi } from '../types'
import { useDeclarativeFormOptional } from './form-context'

const EMPTY_SNAPSHOT: PendingRegistrySnapshot = { count: 0, submitQueued: false }
const noopSubscribe = () => () => undefined

/**
 * Для корня формы: создаёт реестр ожидания (§16.7) и `submit()` — отправку, которая ждёт его пустоты. Реестр пуст —
 * `form.handleSubmit()` в том же тике, поведение формы без оптимистичных действий не меняется.
 */
export function useFormPending(form: AppFormApi): { pending: PendingRegistry; submit: () => Promise<void> } {
  const [pending] = useState(createPendingRegistry)
  const submit = useCallback(() => pending.submitWhenSettled(() => form.handleSubmit()), [pending, form])
  return { pending, submit }
}

/** Реестр ожидания формы; `null` вне формы или в обёртке без реестра */
export function useFormPendingRegistry(): PendingRegistry | null {
  return useDeclarativeFormOptional()?.pending ?? null
}

/** Подписка на реестр: `count` — сколько оптимистичных действий ждут сервера, `submitQueued` — отправка в очереди */
export function useFormPendingSnapshot(): PendingRegistrySnapshot {
  const registry = useFormPendingRegistry()
  return useSyncExternalStore(
    registry?.subscribe ?? noopSubscribe,
    registry?.getSnapshot ?? (() => EMPTY_SNAPSHOT),
    () => EMPTY_SNAPSHOT,
  )
}

/**
 * `form.handleSubmit()` с ожиданием подтверждения оптимистичных действий (`submit()` из контекста); вне формы с
 * реестром — прямой `handleSubmit`. Для навигации шагов и автоотправки OTP.
 */
export function useFormSubmit(form: AppFormApi): () => Promise<void> {
  const contextSubmit = useDeclarativeFormOptional()?.submit
  return useCallback(async () => {
    if (contextSubmit) {
      await contextSubmit()
      return
    }
    await form.handleSubmit()
  }, [contextSubmit, form])
}
