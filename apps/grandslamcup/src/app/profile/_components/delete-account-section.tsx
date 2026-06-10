'use client'

import { DeleteAccountZone } from '@letar/ui'
import { deleteAccountAction } from '../_actions/delete-account.action'

export function DeleteAccountSection() {
  return <DeleteAccountZone onDelete={deleteAccountAction} redirectUrl="/sign-in" />
}
