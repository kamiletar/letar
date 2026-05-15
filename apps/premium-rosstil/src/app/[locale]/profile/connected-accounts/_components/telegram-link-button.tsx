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

interface TelegramLinkButtonProps {
  botUsername: string
  onError: (error: string) => void
}

/**
 * Кнопка привязки Telegram аккаунта
 * Использует кастомный API эндпоинт для связывания аккаунтов
 */
export function TelegramLinkButton({ botUsername, onError }: TelegramLinkButtonProps) {
  const router = useRouter()

  const handleTelegramAuth = async (data: TelegramAuthData) => {
    try {
      // Вызываем кастомный API для привязки Telegram
      const response = await fetch('/api/auth/telegram/link', {
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
        // Обновляем страницу для отображения привязанного аккаунта
        router.refresh()
      } else {
        onError('Не удалось привязать Telegram аккаунт')
      }
    } catch {
      onError('Произошла ошибка при привязке Telegram аккаунта')
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
