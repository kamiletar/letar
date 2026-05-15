'use client'

import { useRouter } from '@/i18n/navigation'
import { LoginButton } from '@telegram-auth/react'

interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

interface TelegramLoginButtonProps {
  botUsername: string
}

/**
 * Кнопка входа через Telegram
 * Использует кастомный API эндпоинт для аутентификации
 */
export function TelegramLoginButton({ botUsername }: TelegramLoginButtonProps) {
  const router = useRouter()

  const handleTelegramAuth = async (data: TelegramAuthData) => {
    try {
      // Вызываем кастомный API для Telegram аутентификации
      const response = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: data.id.toString(),
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
          photo_url: data.photo_url,
          auth_date: data.auth_date.toString(),
          hash: data.hash,
        }),
      })

      if (response.ok) {
        router.push('/')
        router.refresh()
      } else {
        const error = await response.json()
        console.error('Telegram authentication failed:', error)
      }
    } catch (error) {
      console.error('Telegram authentication error:', error)
    }
  }

  return (
    <LoginButton
      botUsername={botUsername}
      onAuthCallback={handleTelegramAuth}
      buttonSize="large"
      lang="ru"
      showAvatar={true}
      cornerRadius={5}
    />
  )
}
