import { revalidatePath } from 'next/cache'

import { decryptSecret, encryptSecret } from '../crypto'
import type { CreateSocialProviderActionsOptions, SocialProviderActions } from './types'

const DEFAULT_UNAUTHORIZED_MESSAGE = 'Требуется авторизация'
const DEFAULT_KEY_MISSING_MESSAGE = 'AUTH_ENCRYPTION_KEY не настроен на сервере — обратитесь к разработчику'

/**
 * Создаёт 4 Server Actions для self-service админки Tier2 OAuth-провайдеров
 * (`SocialProvider`: clientId/clientSecret Google/VK/Yandex и т.д., шифруется at-rest).
 *
 * Используется вместе с client-компонентами `SocialProvidersList`/`SocialProviderForm`
 * из `@letar/auth/client`. Извлечено после третьего дословного дубля (dsperevod → aboi →
 * driving-school) — см. `libs/auth/README.md` § SocialProvidersSettings.
 *
 * @example
 * ```typescript
 * // apps/my-app/src/app/admin/social-providers/_actions/social-provider.action.ts
 * 'use server'
 *
 * import { createSocialProviderActions, getEncryptionKey } from '@letar/auth/server'
 * import { requireAdmin } from '@/lib/auth-utils'
 * import { getEnhancedPrisma } from '@/lib/db'
 *
 * export const { createSocialProvider, updateSocialProvider, deleteSocialProvider,
 *   getSocialProviderSecretHint } = createSocialProviderActions({
 *   requireAuth: () => requireAdmin(),
 *   getDb: (user) => getEnhancedPrisma(user),
 *   encryptionKey: () => getEncryptionKey(),
 *   basePath: '/admin/social-providers',
 * })
 * ```
 */
export function createSocialProviderActions<TUser>(
  options: CreateSocialProviderActionsOptions<TUser>
): SocialProviderActions {
  const {
    requireAuth,
    getDb,
    encryptionKey,
    basePath,
    unauthorizedMessage = DEFAULT_UNAUTHORIZED_MESSAGE,
    keyMissingMessage = DEFAULT_KEY_MISSING_MESSAGE,
  } = options

  return {
    async createSocialProvider(data) {
      const user = await requireAuth()
      if (!user) {
        return { error: unauthorizedMessage }
      }

      if (!data.clientSecret) {
        return { error: 'Client Secret обязателен для нового провайдера' }
      }

      const key = encryptionKey()
      if (!key) {
        return { error: keyMissingMessage }
      }

      const db = getDb(user)
      await db.socialProvider.create({
        data: {
          providerId: data.providerId,
          clientId: data.clientId,
          clientSecret: encryptSecret(data.clientSecret, key),
          enabled: data.enabled ?? true,
        },
      })

      revalidatePath(basePath)
      return { data: null }
    },

    async updateSocialProvider(id, data) {
      const user = await requireAuth()
      if (!user) {
        return { error: unauthorizedMessage }
      }

      const key = encryptionKey()
      if (!key) {
        return { error: keyMissingMessage }
      }

      const db = getDb(user)
      await db.socialProvider.update({
        where: { id },
        data: {
          providerId: data.providerId,
          clientId: data.clientId,
          // Пустой clientSecret при редактировании = не менять
          ...(data.clientSecret && { clientSecret: encryptSecret(data.clientSecret, key) }),
          enabled: data.enabled ?? true,
        },
      })

      revalidatePath(basePath)
      revalidatePath(`${basePath}/${id}`)
      return { data: null }
    },

    async deleteSocialProvider(id) {
      const user = await requireAuth()
      if (!user) {
        return { error: unauthorizedMessage }
      }

      const db = getDb(user)
      await db.socialProvider.delete({ where: { id } })
      revalidatePath(basePath)
      return { data: null }
    },

    /**
     * Расшифровывает clientSecret только для показа последних символов (маска) —
     * полный секрет никогда не отдаётся клиенту после сохранения.
     */
    async getSocialProviderSecretHint(id) {
      const user = await requireAuth()
      if (!user) {
        return null
      }

      const db = getDb(user)
      const provider = await db.socialProvider.findUnique({ where: { id }, select: { clientSecret: true } })
      if (!provider) {
        return null
      }

      const key = encryptionKey()
      if (!key) {
        return null
      }

      const plain = decryptSecret(provider.clientSecret, key)
      return `••••${plain.slice(-4)}`
    },
  }
}
