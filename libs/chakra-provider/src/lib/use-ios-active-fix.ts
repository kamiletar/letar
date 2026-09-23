'use client'

import { useEffect } from 'react'

/**
 * iOS-фикс для `:active` (и `_active` в Chakra): Safari на iOS не применяет `:active`, пока на
 * документе нет ни одного `touchstart`-листенера. Вешаем пустой пассивный — на скролл он не влияет
 * (`passive: true`), на не-iOS платформах и в Electron ничего не меняет.
 *
 * Листенер снимается в cleanup: в StrictMode (dev) эффект выполняется дважды, без снятия на
 * `document` копились бы дубли.
 *
 * `RootChakraProvider` вызывает хук сам. Явный вызов нужен только приложениям на голом
 * `ChakraProvider` из `@chakra-ui/react`.
 */
export function useIosActiveFix(): void {
  useEffect(() => {
    const noop = () => undefined
    document.addEventListener('touchstart', noop, { passive: true })
    return () => document.removeEventListener('touchstart', noop)
  }, [])
}
