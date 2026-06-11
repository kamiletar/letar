/**
 * Кастомный Better Auth плагин для Passkeys / WebAuthn (Этап 6.5 PLAN.md).
 *
 * Использует createAuthEndpoint + getSessionFromCtx + internalAdapter.createSession
 * для полной интеграции с Better Auth сессионной системой.
 *
 * Эндпоинты (доступны по /api/auth/passkey/...):
 *   POST /passkey/register/options   — challenge для регистрации
 *   POST /passkey/register/verify    — сохранить ключ в БД
 *   POST /passkey/authenticate/options — challenge для входа
 *   POST /passkey/authenticate/verify  — верифицировать + создать сессию
 */

import { createAuthEndpoint, getSessionFromCtx } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import type { BetterAuthPlugin } from 'better-auth/types'
import { z } from 'zod/v4'
import {
  generatePasskeyAuthenticationOptions,
  generatePasskeyRegistrationOptions,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration,
} from './server'

export function passkeyPlugin(): BetterAuthPlugin {
  return {
    id: 'passkey',

    endpoints: {
      passkeyRegisterOptions: createAuthEndpoint(
        '/passkey/register/options',
        { method: 'POST', requireHeaders: true },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx)
          if (!session?.user) {
            return ctx.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const options = await generatePasskeyRegistrationOptions(
            session.user.id,
            session.user.name ?? '',
            session.user.email
          )
          return ctx.json(options)
        }
      ),

      passkeyRegisterVerify: createAuthEndpoint(
        '/passkey/register/verify',
        {
          method: 'POST',
          requireHeaders: true,
          body: z.object({
            response: z.record(z.string(), z.unknown()),
            name: z.string().optional(),
          }),
        },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx)
          if (!session?.user) {
            return ctx.json({ error: 'Unauthorized' }, { status: 401 })
          }

          const passkeyData = await verifyPasskeyRegistration(
            session.user.id,
            ctx.body.response as unknown as Parameters<typeof verifyPasskeyRegistration>[1],
            ctx.body.name
          )

          await ctx.context.adapter.create({
            model: 'passkey',
            data: passkeyData,
          })

          return ctx.json({ verified: true })
        }
      ),

      passkeyAuthOptions: createAuthEndpoint(
        '/passkey/authenticate/options',
        { method: 'POST', requireHeaders: true },
        async (ctx) => {
          try {
            // Пустой allowCredentials → discoverable credential flow (Conditional UI).
            // Браузер сам найдёт подходящие ключи в дропдауне автозаполнения.
            // Verify шаг ищет конкретный credentialId в БД.
            const options = await generatePasskeyAuthenticationOptions([])
            return ctx.json(options)
          } catch {
            return ctx.json({ error: 'Не удалось получить параметры входа' }, { status: 500 })
          }
        }
      ),

      passkeyAuthVerify: createAuthEndpoint(
        '/passkey/authenticate/verify',
        {
          method: 'POST',
          requireHeaders: true,
          body: z.object({
            response: z.record(z.string(), z.unknown()),
          }),
        },
        async (ctx) => {
          const credId = ctx.body.response.id as string | undefined
          if (!credId) {
            throw new Error('credentialId отсутствует')
          }

          const passkeys = (await ctx.context.adapter.findMany({
            model: 'passkey',
            where: [{ field: 'id', value: credId }],
          })) as Array<{
            id: string
            publicKey: Buffer
            counter: bigint
            transports: string | null
            userId: string
          }>

          const passkey = passkeys[0]
          if (!passkey) {
            throw new Error('Passkey не найден')
          }

          // Получаем полный объект пользователя для setSessionCookie
          const userRecord = await ctx.context.internalAdapter.findUserById(passkey.userId)
          if (!userRecord) {
            throw new Error('Пользователь не найден')
          }

          const { newCounter } = await verifyPasskeyAuthentication(
            ctx.body.response as unknown as Parameters<typeof verifyPasskeyAuthentication>[0],
            {
              id: passkey.id,
              publicKey: passkey.publicKey,
              counter: passkey.counter,
              transports: passkey.transports,
            }
          )

          // Обновляем счётчик (защита от replay-атак)
          await ctx.context.adapter.update({
            model: 'passkey',
            where: [{ field: 'id', value: passkey.id }],
            update: { counter: newCounter },
          })

          // Создаём сессию через Better Auth internal adapter
          const newSession = await ctx.context.internalAdapter.createSession(passkey.userId)
          if (!newSession) {
            throw new Error('Ошибка создания сессии')
          }

          // Устанавливаем session cookie (тот же паттерн что magic-link)
          await setSessionCookie(ctx, { session: newSession, user: userRecord })

          return ctx.json({
            verified: true,
            user: { id: userRecord.id, email: userRecord.email, name: userRecord.name },
          })
        }
      ),

      passkeyDelete: createAuthEndpoint(
        '/passkey/delete',
        {
          method: 'POST',
          requireHeaders: true,
          body: z.object({
            passkeyId: z.string(),
          }),
        },
        async (ctx) => {
          const session = await getSessionFromCtx(ctx)
          if (!session?.user) {
            return ctx.json({ error: 'Unauthorized' }, { status: 401 })
          }

          // Проверяем что ключ принадлежит текущему пользователю
          const passkeys = (await ctx.context.adapter.findMany({
            model: 'passkey',
            where: [
              { field: 'id', value: ctx.body.passkeyId },
              { field: 'userId', value: session.user.id },
            ],
          })) as Array<{ id: string }>

          if (!passkeys.length) {
            return ctx.json({ error: 'Passkey не найден' }, { status: 404 })
          }

          await ctx.context.adapter.delete({
            model: 'passkey',
            where: [{ field: 'id', value: ctx.body.passkeyId }],
          })

          return ctx.json({ deleted: true })
        }
      ),
    },

    // Схема для Better Auth adapter
    schema: {
      passkey: {
        fields: {
          name: { type: 'string', required: false },
          publicKey: { type: 'string', required: true },
          userId: { type: 'string', required: true, references: { model: 'user', field: 'id' } },
          webAuthnUserId: { type: 'string', required: true },
          counter: { type: 'number', required: true },
          deviceType: { type: 'string', required: true },
          backedUp: { type: 'boolean', required: true },
          transports: { type: 'string', required: false },
          createdAt: { type: 'date', required: false },
        },
      },
    },
  }
}
