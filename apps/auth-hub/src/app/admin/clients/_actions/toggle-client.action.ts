'use server'

import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function toggleClientDisabled(clientId: string, currentDisabled: boolean) {
  await requireAdmin()

  await prisma.oauthApplication.update({
    where: { clientId },
    data: { disabled: !currentDisabled },
  })

  revalidatePath('/admin/clients')
}
