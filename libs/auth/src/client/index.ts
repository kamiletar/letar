/**
 * @letar/auth/client — Клиентские хелперы для Better Auth
 *
 * @example
 * ```typescript
 * // Базовый клиент (без кастомных OAuth)
 * import { createAuthClient } from '@letar/auth/client'
 * export const authClient = createAuthClient()
 *
 * // Клиент с genericOAuth (для Yandex и др.)
 * import { createAuthClientWithOAuth } from '@letar/auth/client'
 * export const authClient = createAuthClientWithOAuth()
 * // signIn.oauth2 доступен
 *
 * // OAuth кнопки
 * import { createOAuthButtons } from '@letar/auth/client'
 * export const OAuthButtons = createOAuthButtons(authClient)
 *
 * // Типизированный useSession
 * import { createTypedUseSession } from '@letar/auth/client'
 * export const useSession = createTypedUseSession<MySession>(authClient)
 * ```
 */

// Auth client factories
export {
  type AuthClient,
  type AuthClientOptions,
  type AuthClientWithOAuth,
  type AuthClientWithOAuthOptions,
  createAuthClient,
  createAuthClientWithOAuth,
} from './create-auth-client'

// Components
export { type AuthGuardProps, createAuthGuard } from './auth-guard'
export {
  createOAuthButtons,
  type OAuthButtonsProps,
  type OAuthProvider,
  type OAuthProviderConfig,
} from './oauth-buttons'
export { OnlyFor, type OnlyForProps } from './only-for'
export {
  type ResendCapableAuthClient,
  ResendVerificationButton,
  type ResendVerificationButtonProps,
} from './resend-verification-button'
export { SessionProvider, type SessionProviderProps } from './session-provider'

// Factories
export {
  createSignInWithLetarAuth,
  type CreateSignInWithLetarAuthOptions,
  createTypedUseSession,
  getLetarAuthErrorMessage,
  type TypedSessionResult,
} from './factories'

// Connected Accounts
export {
  AccountCard,
  ConnectedAccountsList,
  type ConnectedAccountsListProps,
  providerColors,
  providerNames,
} from './connected-accounts'

// Auth Mode (Tier 1 / Tier 2 informed-consent, Этап 8 корневого PLAN.md)
export {
  AuthModeRequestForm,
  type AuthModeRequestFormProps,
  type AuthModeRequestResult,
  type AuthModeRequestRow,
  AuthModeSettings,
  type AuthModeSettingsProps,
  type AuthModeTierPoint,
} from './auth-mode'

// Social Providers (Tier 2 self-service OAuth-ключи, извлечено после третьего дословного дубля
// dsperevod → aboi → driving-school)
export {
  SocialProviderForm,
  type SocialProviderFormProps,
  SocialProvidersList,
  type SocialProvidersListProps,
} from './social-providers'

// Icons
export { FacebookIcon, GitHubIcon, GoogleIcon, TelegramIcon, VKIcon, YandexIcon } from './icons'
