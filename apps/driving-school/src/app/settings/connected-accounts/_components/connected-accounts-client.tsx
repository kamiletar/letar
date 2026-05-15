'use client'

import type { AccountBase } from '@letar/auth'
import { ConnectedAccountsList } from '@letar/auth/client'
import { unlinkAccount } from '../_actions/unlink-account.action'

interface ConnectedAccountsClientProps {
  accounts: AccountBase[]
  hasPassword: boolean
  userEmail: string
}

/**
 * Клиентский компонент для управления связанными аккаунтами
 *
 * Использует ConnectedAccountsList из @letar/auth с настройками для driving-school:
 * - Провайдеры: Google, Яндекс, VK
 * - Редирект после привязки: /settings/connected-accounts
 * - Страница смены пароля: /settings/security
 */
export function ConnectedAccountsClient({ accounts, hasPassword, userEmail }: ConnectedAccountsClientProps) {
  return (
    <ConnectedAccountsList
      accounts={accounts}
      hasPassword={hasPassword}
      userEmail={userEmail}
      providers={['google', 'yandex', 'vk']}
      linkCallbackUrl="/settings/connected-accounts"
      changePasswordUrl="/settings/security"
      onUnlink={unlinkAccount}
    />
  )
}
