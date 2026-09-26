/**
 * Реестр неподтверждённых оптимистичных действий формы (§16.7) — framework-free.
 *
 * Штатного места в TanStack Form нет: `handleSubmit` сначала проверяет все поля и только потом зовёт `onSubmit`,
 * поэтому ждать подтверждения внутри `onSubmit` поздно. Поле кладёт в реестр промис своего действия (`true` —
 * подтверждено, `false` — отказ), корень формы перед отправкой ждёт его пустоты.
 */

export interface PendingRegistrySnapshot {
  /** Сколько действий ждут подтверждения */
  count: number
  /** Отправка поставлена в очередь и ждёт подтверждения (для `loading` кнопки) */
  submitQueued: boolean
}

export interface PendingRegistry {
  /**
   * Зарегистрировать действие. Возвращает функцию «снять»: запись убирается без вердикта (поле размонтировано) —
   * отправку она не держит и не отменяет. Запись снимается и сама, когда промис завершился.
   * `focus` — куда вернуть фокус, если действие закончилось отказом при ждущей отправке.
   */
  add: (settled: Promise<boolean>, options?: { focus?: () => void }) => () => void
  subscribe: (listener: () => void) => () => void
  /** Снимок для `useSyncExternalStore`: новый объект только при изменении */
  getSnapshot: () => PendingRegistrySnapshot
  /** Дождаться всех записей (и добавленных за время ожидания). `false` — хотя бы одна закончилась отказом */
  settleAll: () => Promise<boolean>
  /**
   * Отправить форму, когда всё подтверждено. Реестр пуст — `submit` в том же тике. Иначе — очередь: пока она
   * есть, повторный вызов игнорируется; при отказе `submit` не вызывается, фокус — на поле с отказом.
   */
  submitWhenSettled: (submit: () => unknown) => Promise<void>
}

type Verdict = 'settled' | 'failed' | 'cancelled'

interface Entry {
  verdict: Promise<Verdict>
  finish: (verdict: Verdict) => void
  focus?: () => void
}

export function createPendingRegistry(): PendingRegistry {
  const entries = new Set<Entry>()
  const listeners = new Set<() => void>()
  let snapshot: PendingRegistrySnapshot = { count: 0, submitQueued: false }

  const publish = (next: Partial<PendingRegistrySnapshot>) => {
    const merged = { ...snapshot, ...next }
    if (merged.count === snapshot.count && merged.submitQueued === snapshot.submitQueued) {
      return
    }
    snapshot = merged
    for (const listener of [...listeners]) {
      listener()
    }
  }

  const add: PendingRegistry['add'] = (settled, options) => {
    let finish: (verdict: Verdict) => void = () => undefined
    const entry: Entry = {
      verdict: new Promise<Verdict>((resolve) => {
        finish = resolve
      }),
      finish: (verdict) => {
        if (!entries.delete(entry)) {
          return
        }
        finish(verdict)
        publish({ count: entries.size })
      },
      focus: options?.focus,
    }
    entries.add(entry)
    publish({ count: entries.size })
    settled.then(
      (ok) => entry.finish(ok ? 'settled' : 'failed'),
      () => entry.finish('failed'),
    )
    return () => entry.finish('cancelled')
  }

  const wait = async (): Promise<{ ok: boolean; failedFocus?: () => void }> => {
    let ok = true
    let failedFocus: (() => void) | undefined
    while (entries.size > 0) {
      const current = [...entries]
      const verdicts = await Promise.all(current.map((entry) => entry.verdict))
      verdicts.forEach((verdict, index) => {
        if (verdict === 'failed') {
          ok = false
          failedFocus ??= current[index].focus
        }
      })
    }
    return { ok, failedFocus }
  }

  return {
    add,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => snapshot,
    settleAll: async () => (await wait()).ok,
    submitWhenSettled: async (submit) => {
      if (entries.size === 0) {
        await submit()
        return
      }
      if (snapshot.submitQueued) {
        return
      }
      publish({ submitQueued: true })
      let result: Awaited<ReturnType<typeof wait>>
      try {
        result = await wait()
      } finally {
        publish({ submitQueued: false })
      }
      if (result.ok) {
        await submit()
      } else {
        result.failedFocus?.()
      }
    },
  }
}
