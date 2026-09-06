'use client'

import { useEffect } from 'react'

/**
 * Результат `form.store.subscribe()` в разных версиях `@tanstack/store`:
 * v0.7.x/v0.9.x возвращают bare unsubscribe-функцию, v0.11+ — объект `{ unsubscribe }`.
 */
type StoreSubscription = (() => void) | { unsubscribe: () => void }

interface FormStoreLike {
  store: {
    subscribe: (callback: () => void) => StoreSubscription
  }
}

/**
 * Подписывается на `form.store` и корректно вызывает cleanup независимо от версии `@tanstack/store`.
 *
 * До этого хука каждый вызывающий код вручную решал, звать ли возвращённое значение как функцию
 * или как `{ unsubscribe }`, и часть мест угадывала неверно — эффект возвращал объект вместо функции
 * cleanup'а, React ругался `useEffect must not return anything besides a function`, а сама подписка
 * никогда не отписывалась (утекала на каждый mount/unmount).
 *
 * @example
 * ```tsx
 * useFormStoreSubscribe(form, () => {
 *   const values = form.state.values
 *   // ...
 * }, [form, titleName, slugName])
 * ```
 */
export function useFormStoreSubscribe(form: FormStoreLike, callback: () => void, deps: unknown[]): void {
  // Обёртка над useEffect с пробрасываемым извне deps-массивом — сигнатура хука намеренно
  // отдаёт выбор зависимостей вызывающему коду (аналог useDeepCompareEffect и подобных
  // библиотечных хуков), поэтому статическая проверка exhaustive-deps здесь неприменима:
  // `form`/`callback` пересоздаются на каждом рендере вызывающего компонента, а ресабскрайб
  // должен происходить только по значениям из явно переданного `deps`.
  useEffect(() => {
    const subscription = form.store.subscribe(callback)
    return () => {
      if (typeof subscription === 'function') {
        subscription()
      } else {
        subscription.unsubscribe()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps приходит параметром хука, см. комментарий выше
  }, deps)
}
