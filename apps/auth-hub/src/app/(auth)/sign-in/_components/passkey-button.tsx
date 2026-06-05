'use client'

import { Button, Text } from '@chakra-ui/react'
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface PasskeySignInButtonProps {
  /** URL для редиректа после успешного входа */
  callbackUrl?: string
}

/**
 * Кнопка входа по Passkey (Face ID / Touch ID / Windows Hello).
 * Доступна только если браузер поддерживает WebAuthn.
 */
export function PasskeySignInButton({ callbackUrl = '/auth/post-login' }: PasskeySignInButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!browserSupportsWebAuthn()) {return null}

  async function handlePasskeySignIn() {
    setLoading(true)
    setError(null)

    try {
      // 1. Получаем challenge от сервера
      const optionsRes = await fetch('/api/auth/passkey/authenticate/options', { method: 'POST' })
      if (!optionsRes.ok) {throw new Error('Не удалось получить параметры входа')}
      const options = await optionsRes.json()

      // 2. Запускаем WebAuthn в браузере (запрос к устройству)
      const response = await startAuthentication({ optionsJSON: options })

      // 3. Отправляем ответ на сервер для верификации
      const verifyRes = await fetch('/api/auth/passkey/authenticate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response }),
      })

      const result = await verifyRes.json()
      if (!verifyRes.ok || !result.verified) {
        throw new Error(result.error || 'Вход по passkey не удался')
      }

      router.push(callbackUrl)
      router.refresh()
    } catch (e) {
      // Пользователь отменил — не показываем ошибку
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setLoading(false)
        return
      }
      setError(e instanceof Error ? e.message : 'Ошибка входа по passkey')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handlePasskeySignIn}
        loading={loading}
        loadingText="Проверка..."
        w="full"
        gap={2}
      >
        🔑 Face ID / Touch ID / Ключ доступа
      </Button>
      {error && (
        <Text color="red.500" fontSize="sm" textAlign="center">
          {error}
        </Text>
      )}
    </>
  )
}

interface PasskeyRegisterButtonProps {
  /** Имя устройства (опционально) */
  deviceName?: string
  onSuccess?: () => void
}

/**
 * Кнопка регистрации нового Passkey (для страницы профиля/настроек).
 * Требует активной сессии.
 */
export function PasskeyRegisterButton({ deviceName, onSuccess }: PasskeyRegisterButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!browserSupportsWebAuthn()) {return null}

  async function handleRegister() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const optionsRes = await fetch('/api/auth/passkey/register/options', { method: 'POST' })
      if (!optionsRes.ok) {throw new Error('Нет активной сессии')}
      const options = await optionsRes.json()

      const response = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch('/api/auth/passkey/register/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, name: deviceName }),
      })

      const result = await verifyRes.json()
      if (!verifyRes.ok || !result.verified) {
        throw new Error(result.error || 'Не удалось зарегистрировать ключ доступа')
      }

      setSuccess(true)
      onSuccess?.()
    } catch (e) {
      if (e instanceof Error && e.name === 'NotAllowedError') {
        setLoading(false)
        return
      }
      setError(e instanceof Error ? e.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={handleRegister}
        loading={loading}
        loadingText="Регистрация..."
        colorPalette={success ? 'green' : undefined}
      >
        {success ? '✅ Ключ добавлен' : '➕ Добавить ключ доступа (Passkey)'}
      </Button>
      {error && (
        <Text color="red.500" fontSize="sm">
          {error}
        </Text>
      )}
    </>
  )
}
