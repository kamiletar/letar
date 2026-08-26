'use server'

import { requireAdmin } from '@/lib/auth'
import { hashOauthClientSecret } from '@/lib/oauth-client-secret'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomBytes } from 'node:crypto'
import { z } from 'zod/v4'

const ClientSchema = z
  .object({
    name: z.string().min(1, 'Название обязательно').max(100),
    clientId: z
      .string()
      .min(1, 'Client ID обязателен')
      .regex(/^[a-z0-9-]+$/, 'Только строчные буквы, цифры и дефис'),
    redirectUrls: z.string().min(1, 'Укажите хотя бы один redirect URL'),
    type: z.enum(['web', 'native', 'spa']).default('web'),
    skipConsent: z.boolean().default(false),
  })
  .strip()

const UpdateClientSchema = z
  .object({
    name: z.string().min(1, 'Название обязательно').max(100),
    redirectUrls: z.string().min(1, 'Укажите хотя бы один redirect URL'),
    type: z.enum(['web', 'native', 'spa']).default('web'),
    skipConsent: z.boolean().default(false),
    disabled: z.boolean().default(false),
  })
  .strip()

export type ClientActionError = {
  message: string
  fields?: Record<string, string[]>
}

function generateSecret(): string {
  return randomBytes(32).toString('hex')
}

/** Нормализует список redirect URLs — по одному на строку → массив */
function parseRedirectUrlList(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((u) => u.trim())
    .filter(Boolean)
}

export async function createClientAction(
  formData: FormData,
): Promise<{ error: ClientActionError } | { clientId: string; secret: string }> {
  await requireAdmin()

  const raw = {
    name: formData.get('name') as string,
    clientId: formData.get('clientId') as string,
    redirectUrls: formData.get('redirectUrls') as string,
    type: (formData.get('type') as string) || 'web',
    skipConsent: formData.get('skipConsent') === 'true',
  }

  const parsed = ClientSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: { message: 'Ошибка валидации', fields: parsed.error.flatten().fieldErrors as Record<string, string[]> },
    }
  }

  const existing = await prisma.oauthApplication.findFirst({
    where: { clientId: parsed.data.clientId },
    select: { id: true },
  })
  if (existing) {
    return { error: { message: 'Client ID уже занят', fields: { clientId: ['Этот Client ID уже используется'] } } }
  }

  const secret = generateSecret()
  const redirectUris = parseRedirectUrlList(parsed.data.redirectUrls)

  const client = await prisma.oauthApplication.create({
    data: {
      name: parsed.data.name,
      clientId: parsed.data.clientId,
      // @better-auth/oauth-provider хранит clientSecret хешированным (см. oauth-client-secret.ts) —
      // plaintext возвращаем админу один раз в ответе action, в БД пишем только хеш.
      clientSecret: await hashOauthClientSecret(secret),
      redirectUrls: redirectUris.join(','),
      redirectUris,
      type: parsed.data.type,
      skipConsent: parsed.data.skipConsent,
      disabled: false,
    },
    select: { clientId: true },
  })

  revalidatePath('/admin/clients')
  return { clientId: client.clientId, secret }
}

export async function updateClientAction(
  clientId: string,
  formData: FormData,
): Promise<{ error: ClientActionError } | { success: true }> {
  await requireAdmin()

  const raw = {
    name: formData.get('name') as string,
    redirectUrls: formData.get('redirectUrls') as string,
    type: (formData.get('type') as string) || 'web',
    skipConsent: formData.get('skipConsent') === 'true',
    disabled: formData.get('disabled') === 'true',
  }

  const parsed = UpdateClientSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      error: { message: 'Ошибка валидации', fields: parsed.error.flatten().fieldErrors as Record<string, string[]> },
    }
  }

  const redirectUris = parseRedirectUrlList(parsed.data.redirectUrls)

  await prisma.oauthApplication.update({
    where: { clientId },
    data: {
      name: parsed.data.name,
      redirectUrls: redirectUris.join(','),
      redirectUris,
      type: parsed.data.type,
      skipConsent: parsed.data.skipConsent,
      disabled: parsed.data.disabled,
    },
  })

  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${clientId}`)
  return { success: true }
}

export async function rotateSecretAction(clientId: string): Promise<{ secret: string } | { error: ClientActionError }> {
  await requireAdmin()

  const existing = await prisma.oauthApplication.findFirst({
    where: { clientId },
    select: { id: true },
  })
  if (!existing) {
    return { error: { message: `Клиент ${clientId} не найден` } }
  }

  const secret = generateSecret()
  await prisma.oauthApplication.update({
    where: { clientId },
    data: { clientSecret: await hashOauthClientSecret(secret) },
  })

  revalidatePath(`/admin/clients/${clientId}`)
  return { secret }
}

export async function deleteClientAction(clientId: string): Promise<void> {
  await requireAdmin()
  await prisma.oauthApplication.delete({ where: { clientId } })
  revalidatePath('/admin/clients')
  redirect('/admin/clients')
}
