'use client'

import type { AccountBase } from '@letar/auth'
import { ConnectedAccountsList } from '@letar/auth/client'
import { unlinkAccount } from '../_actions/unlink-account'

interface Props {
  accounts: AccountBase[]
  hasPassword: boolean
  userEmail: string
}

/**
 * Обёртка для ConnectedAccountsList с привязкой к server action
 */
export function ConnectedAccountsWrapper({ accounts, hasPassword, userEmail }: Props) {
  return (
    <ConnectedAccountsList
      accounts={accounts}
      hasPassword={hasPassword}
      userEmail={userEmail}
      providers={['google', 'github', 'yandex', 'vk']}
      linkCallbackUrl="/profile/connected-accounts"
      changePasswordUrl="/profile/change-password"
      onUnlink={unlinkAccount}
    />
  )
}
