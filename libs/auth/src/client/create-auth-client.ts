'use client'

import { createAuthClient as createBetterAuthClient } from 'better-auth/react'

/**
 * Резолвит baseURL клиента: явный параметр → `NEXT_PUBLIC_APP_URL` (build-time) →
 * `window.location.origin` (runtime).
 *
 * `NEXT_PUBLIC_*` инлайнится в бандл только на этапе `next build` — если приложение
 * собирается общим Docker-образом без передачи этой переменной как build ARG (обычная практика
 * в этом монорепо, см. `Dockerfile.production`), в бандле навсегда остаётся `undefined`, и клиент
 * бьёт мимо реального домена (staging/прод) из браузера пользователя, хотя серверный
 * `BETTER_AUTH_URL` настроен верно. Найдено на `dsperevod`/`svoichuzhie` (PLAN.md §18.7 batch2,
 * 2026-07-21) — `email-verification`/`10-auth` тесты падали именно по этой причине, сервер
 * при этом отвечал 200 на прямой curl. `window.location.origin` не зависит от build-time
 * переменных вообще и всегда указывает на реальный текущий домен.
 */
function resolveClientBaseURL(explicit?: string): string | undefined {
  if (explicit) {
    return explicit
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  return typeof window !== 'undefined' ? window.location.origin : undefined
}

/** Опции createBetterAuthClient (better-auth 1.7+, @better-auth/core BetterAuthClientOptions) */
type BetterAuthClientOptions = NonNullable<Parameters<typeof createBetterAuthClient>[0]>

/**
 * Опции для создания auth клиента
 */
export interface AuthClientOptions {
  /** URL сервера авторизации (по умолчанию — см. {@link resolveClientBaseURL}) */
  baseURL?: string
  /** Дополнительные плагины Better Auth */
  plugins?: unknown[]
}

/**
 * Опции для создания auth клиента с genericOAuth — те же опции, что принимает `createAuthClient`
 * из `better-auth/react` (включая `plugins` с точными типами приложения, например
 * `organizationClient()`). `Option` выводится TS напрямую из переданного объекта (он же передан
 * параметром функции ниже) — благодаря этому возвращаемый клиент сохраняет типы, специфичные для
 * подключённых плагинов (`authClient.organization.*`). `baseURL` внутри уже опционален в
 * `BetterAuthClientOptions`, отдельный тип для него не нужен — переопределяем значение через
 * {@link resolveClientBaseURL} внутри функции, не в типе.
 */
export type AuthClientWithOAuthOptions<Option extends BetterAuthClientOptions = BetterAuthClientOptions> = Option

type BaseAuthClient<Option extends BetterAuthClientOptions> = ReturnType<typeof createBetterAuthClient<Option>>

/** Параметры входа через генерик-OAuth провайдера (Yandex, Ключница, Shikimori и т.д.) */
export interface OAuth2SignInParams {
  providerId: string
  callbackURL?: string
  errorCallbackURL?: string
  newUserCallbackURL?: string
}

// `BaseAuthClient<Option>['signIn']` не индексируется напрямую, пока Option остаётся дженериком
// (TS2536/TS2344 — известное ограничение TS на индексируемый доступ поверх условных/мэппед типов
// внешней библиотеки). Обходим через structural extends+infer — та же информация, без прямого
// индекса по литералу.
type SignInOf<Option extends BetterAuthClientOptions> = BaseAuthClient<Option> extends { signIn: infer S } ? S
  : never
type SocialSignInOf<Option extends BetterAuthClientOptions> = SignInOf<Option> extends { social: infer F } ? F
  : never

// Типизированный клиент с oauth2-совместимой сигнатурой поверх signIn.social
type BetterAuthClientWithOAuth<Option extends BetterAuthClientOptions> = BaseAuthClient<Option> & {
  signIn: SignInOf<Option> & {
    oauth2: (
      params: OAuth2SignInParams,
    ) => SocialSignInOf<Option> extends (...args: never[]) => unknown ? ReturnType<SocialSignInOf<Option>>
      : Promise<unknown>
  }
}

/**
 * Создаёт клиент Better Auth с поддержкой генерик-OAuth провайдеров (кастомные провайдеры,
 * зарегистрированные через серверный `genericOAuth()` — Yandex, Ключница/`letar-auth` и т.д.)
 *
 * Better Auth 1.7+ убрал отдельный `genericOAuthClient()`/`signIn.oauth2` — такие провайдеры
 * теперь используют тот же `signIn.social()`, что и встроенные (см. доки `generic-oauth`).
 * `signIn.oauth2()` оставлен здесь тонким алиасом над `signIn.social()`, чтобы не переписывать
 * вызовы во всех потребителях (`createSignInWithLetarAuth` и прямые вызовы в приложениях).
 *
 * @example
 * ```typescript
 * export const authClient = createAuthClientWithOAuth()
 *
 * authClient.signIn.oauth2({ providerId: 'yandex' })
 * ```
 */
export function createAuthClientWithOAuth<Option extends BetterAuthClientOptions = BetterAuthClientOptions>(
  options: Option = {} as Option,
): BetterAuthClientWithOAuth<Option> {
  const { baseURL, ...rest } = options

  const client = createBetterAuthClient({
    ...rest,
    baseURL: resolveClientBaseURL(baseURL),
  } as Option)

  // Better Auth реализует клиент через Proxy над пустой function() {} без ownKeys-трапа —
  // {...client} копирует ноль собственных ключей, любой обычный spread молча теряет useSession/
  // signOut/signIn.social и т.д. Оборачиваем настоящим Proxy, форвардящим через Reflect.get,
  // и подмешиваем oauth2 только на уровне вложенного signIn.
  // Внутри плагинга типизируем как `any` — TS не может статически индексировать `['signIn']`
  // на клиенте, дженерик по `Option` (TS2536/TS2344 при попытке); публичный тип сохраняется
  // через явный каст результата ниже.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const untypedClient = client as any
  return new Proxy(untypedClient, {
    get(target, prop, receiver) {
      if (prop === 'signIn') {
        const signIn = Reflect.get(target, prop, receiver)
        return new Proxy(signIn, {
          get(signInTarget, signInProp, signInReceiver) {
            if (signInProp === 'oauth2') {
              return ({ providerId, ...rest2 }: OAuth2SignInParams) =>
                untypedClient.signIn.social({ provider: providerId, ...rest2 })
            }
            return Reflect.get(signInTarget, signInProp, signInReceiver)
          },
        })
      }
      return Reflect.get(target, prop, receiver)
    },
  }) as BetterAuthClientWithOAuth<Option>
}

/**
 * Создаёт базовый клиент Better Auth без genericOAuth
 *
 * @example
 * ```typescript
 * export const authClient = createAuthClient()
 * ```
 */
export function createAuthClient(options: AuthClientOptions = {}): ReturnType<typeof createBetterAuthClient> {
  const { baseURL, plugins = [] } = options

  return createBetterAuthClient({
    baseURL: resolveClientBaseURL(baseURL),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: plugins as any,
  })
}

/** Тип auth клиента с genericOAuth (для Yandex и др.) */
export type AuthClientWithOAuth<Option extends BetterAuthClientOptions = BetterAuthClientOptions> =
  BetterAuthClientWithOAuth<Option>

/** Тип базового auth клиента */
export type AuthClient = ReturnType<typeof createAuthClient>
