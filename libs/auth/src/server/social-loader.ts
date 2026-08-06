import type { decryptSecret as DecryptFn } from './crypto'

export interface SocialProviderConfig {
  clientId: string
  clientSecret: string
}

/** Карта провайдеров для передачи в socialProviders Better Auth */
export type SocialProvidersMap = Record<string, SocialProviderConfig>

/** Минимальный интерфейс Prisma-клиента с таблицей socialProvider */
interface PrismaWithSocialProvider {
  socialProvider: {
    findMany(args?: {
      where?: { enabled?: boolean }
    }): Promise<Array<{ providerId: string; clientId: string; clientSecret: string; enabled: boolean }>>
  }
}

/**
 * Создаёт loader для чтения OAuth-провайдеров из БД приложения (Tier 2).
 *
 * Использование в auth.ts:
 * ```typescript
 * import { createSocialProviderLoader } from '@letar/auth/server'
 *
 * export const auth = createAuth({
 *   mode: 'standalone',
 *   social: { source: 'db', load: createSocialProviderLoader(prisma, decryptSecret, key) },
 *   ...
 * })
 * ```
 */
export function createSocialProviderLoader(
  prisma: PrismaWithSocialProvider,
  decrypt: typeof DecryptFn,
  key: Buffer,
): () => Promise<SocialProvidersMap | null> {
  return async () => {
    const providers = await prisma.socialProvider.findMany({
      where: { enabled: true },
    })

    if (providers.length === 0) {
      return null
    }

    const map: SocialProvidersMap = {}
    for (const p of providers) {
      map[p.providerId] = {
        clientId: p.clientId,
        clientSecret: decrypt(p.clientSecret, key),
      }
    }
    return map
  }
}
