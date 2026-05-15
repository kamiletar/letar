'use server'

import { type ContactCreateForm, ContactCreateFormSchema } from '@/generated/form-schemas'
import { db } from '@/lib/db'
import {
  checkRateLimit,
  checkRecordLimit,
  getClientIp,
  RATE_LIMIT_ERROR,
  recordLimitError,
} from '@letar/demo-protection'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createContact(data: ContactCreateForm) {
  const ip = await getClientIp()
  if (!checkRateLimit(ip)) {
    return { error: RATE_LIMIT_ERROR }
  }

  const parsed = ContactCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const count = await db.contact.count()
  if (!checkRecordLimit(count)) {
    return { error: recordLimitError() }
  }

  await db.contact.create({ data: parsed.data })
  revalidatePath('/contacts')
  redirect('/contacts')
}
