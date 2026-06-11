'use client'

import { browserSupportsWebAuthnAutofill, startAuthentication } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Запускает Conditional UI (медиация autofill) при монтировании страницы входа.
 *
 * Браузер показывает passkeys в дропдауне поля email (autoComplete="username webauthn").
 * Пользователь выбирает ключ → Touch ID / Face ID / Windows Hello → вход.
 * Явная кнопка остаётся только как fallback для браузеров без Conditional UI.
 *
 * Особенность: startAuthentication с useBrowserAutofill=true блокирует до выбора ключа.
 * При размонтировании хук не прерывает вызов, но игнорирует результат.
 */
export function usePasskeyConditionalAuth(callbackUrl: string) {
  const router = useRouter()

  useEffect(() => {
    let mounted = true

    async function startConditional() {
      if (!(await browserSupportsWebAuthnAutofill())) {
        return
      }

      try {
        const optionsRes = await fetch('/api/auth/passkey/authenticate/options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
        if (!optionsRes.ok || !mounted) {
          return
        }
        const optionsJSON = await optionsRes.json()

        // Блокирует до выбора passkey из дропдауна браузера
        const response = await startAuthentication({ optionsJSON, useBrowserAutofill: true })
        if (!mounted) {
          return
        }

        const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ response }),
        })
        if (!mounted) {
          return
        }

        const result = await verifyRes.json()
        if (verifyRes.ok && result.verified) {
          router.push(callbackUrl)
          router.refresh()
        }
      } catch {
        // Пользователь отменил, нет passkeys, или браузер не поддерживает — игнорируем
      }
    }

    startConditional()

    return () => {
      mounted = false
    }
  }, [callbackUrl, router])
}
