'use server'

import { type ProductCreateForm, ProductCreateFormSchema } from '@/generated/form-schemas'
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

export async function createProduct(data: ProductCreateForm) {
  const ip = await getClientIp()
  if (!checkRateLimit(ip)) {
    return { error: RATE_LIMIT_ERROR }
  }

  const parsed = ProductCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  const count = await db.product.count()
  if (!checkRecordLimit(count)) {
    return { error: recordLimitError() }
  }

  await db.product.create({ data: parsed.data })
  revalidatePath('/products')
  redirect('/products')
}

export async function updateProduct(id: string, data: ProductCreateForm) {
  const ip = await getClientIp()
  if (!checkRateLimit(ip)) {
    return { error: RATE_LIMIT_ERROR }
  }

  const parsed = ProductCreateFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }

  await db.product.update({ where: { id }, data: parsed.data })
  revalidatePath('/products')
  redirect('/products')
}

export async function deleteProduct(id: string) {
  const ip = await getClientIp()
  if (!checkRateLimit(ip)) {
    return { error: RATE_LIMIT_ERROR }
  }

  await db.product.delete({ where: { id } })
  revalidatePath('/products')
  return { data: null }
}
