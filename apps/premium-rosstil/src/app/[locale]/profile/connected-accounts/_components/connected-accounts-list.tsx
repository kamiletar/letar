'use client'

import type { AccountBase } from '@letar/auth'
import { ConnectedAccountsList as SharedConnectedAccountsList } from '@letar/auth/client'
import { unlinkAccount } from '../_actions/unlink-account'
import { TelegramLinkButton } from './telegram-link-button'

type Account = AccountBase

interface ConnectedAccountsListProps {
  accounts: Account[]
  hasPassword: boolean
  userEmail: string
  telegramBotUsername?: string
}

/**
 * Обёртка над ConnectedAccountsList из @letar/auth
 *
 * Добавляет:
 * - TelegramLinkButton для привязки Telegram
 * - Настройки специфичные для premium-rosstil (пути, провайдеры)
 */
export function ConnectedAccountsList({
  accounts,
  hasPassword,
  userEmail,
  telegramBotUsername,
}: ConnectedAccountsListProps) {
  return (
    <SharedConnectedAccountsList
      accounts={accounts}
      hasPassword={hasPassword}
      userEmail={userEmail}
      providers={['google', 'yandex', 'telegram']}
      linkCallbackUrl="/profile/connected-accounts"
      changePasswordUrl="/profile/change-password"
      onUnlink={unlinkAccount}
      telegramWidget={
        telegramBotUsername ? (
          <TelegramLinkButton
            botUsername={telegramBotUsername}
            onError={(err) => console.error('Telegram link error:', err)}
          />
        ) : undefined
      }
    />
  )
}
