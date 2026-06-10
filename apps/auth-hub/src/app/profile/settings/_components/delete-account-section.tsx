'use client'

import { DeleteAccountZone } from '@letar/ui'
import { deleteAccountAction } from '../_actions/delete-account.action'

/** Секция удаления аккаунта для страницы настроек профиля */
export function DeleteAccountSection() {
  return <DeleteAccountZone onDelete={deleteAccountAction} />
}
