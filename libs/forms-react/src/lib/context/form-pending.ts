'use client'

import { createPendingRegistry, type PendingRegistry, type PendingRegistrySnapshot } from '@letar/forms-core/uikit'
import { useCallback, useState, useSyncExternalStore } from 'react'
import type { AppFormApi } from '../types'
import { useDeclarativeFormOptional } from './form-context'

const EMPTY_SNAPSHOT: PendingRegistrySnapshot = { count: 0, submitQueued: false }
const noopSubscribe = () => () => undefined

/** Для корня формы: реестр ожидания оптимистичных действий полей (§16.7), один на форму */
export function useCreatePendingRegistry(): PendingRegistry {
  const [pending] = useState(createPendingRegistry)
  return pending
}

/**
 * Для корня формы: `submit()` — отправка, которая ждёт пустоты реестра. Реестр пуст — `form.handleSubmit()` в том же
 * тике, поведение формы без оптимистичных действий не меняется.
 */
export function useFormPendingSubmit(pending: PendingRegistry, form: AppFormApi): () => Promise<void> {
  return useCallback(() => pending.submitWhenSettled(() => form.handleSubmit()), [pending, form])
}

const warnedBypass = { done: false }

/**
 * Dev-предупреждение для `onSubmit` корня: форма отправлена мимо `submit()`, пока оптимистичные действия ждут
 * сервера — значение поля ещё прежнее, ушло бы без нового выбора.
 */
export function warnSubmitBypassingPending(pending: PendingRegistry): void {
  const env = process.env.NODE_ENV
  if ((env !== 'development' && env !== 'test') || warnedBypass.done || pending.getSnapshot().count === 0) {
    return
  }
  warnedBypass.done = true
  console.warn(
    '[@letar/forms] form.handleSubmit() was called while optimistic Select/Combobox actions are still pending — '
      + 'use `submit()` from the form context (useDeclarativeForm().submit) or the submit button',
  )
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
