'use client'

import { Button, type ButtonProps, Separator, Stack, type StackProps, Text } from '@chakra-ui/react'
import { type JSX, type ReactNode, useCallback, useState } from 'react'
import type { AuthClientWithOAuth } from './create-auth-client'
import { FacebookIcon } from './icons/facebook-icon'
import { GitHubIcon } from './icons/github-icon'
import { GoogleIcon } from './icons/google-icon'
import { TelegramIcon } from './icons/telegram-icon'
import { VKIcon } from './icons/vk-icon'
import { YandexIcon } from './icons/yandex-icon'

/**
 * Поддерживаемые OAuth провайдеры
 */
export type OAuthProvider = 'google' | 'yandex' | 'github' | 'telegram' | 'vk' | 'facebook'

/**
 * Конфигурация провайдера
 */
export interface OAuthProviderConfig {
  /** ID провайдера */
  id: OAuthProvider
  /** Текст кнопки (по умолчанию "Продолжить с {Provider}") */
  label?: string
  /** Кастомная иконка */
  icon?: ReactNode
  /** Отключён ли провайдер */
  disabled?: boolean
}

/**
 * Props для OAuthButtons
 */
export interface OAuthButtonsProps extends Omit<StackProps, 'direction'> {
  /** URL для редиректа после авторизации */
  callbackUrl?: string
  /** Провайдеры для отображения */
  providers?: (OAuthProvider | OAuthProviderConfig)[]
  /** Направление раскладки */
  direction?: 'vertical' | 'horizontal'
  /** Размер кнопок */
  size?: ButtonProps['size']
  /** Вариант кнопок */
  variant?: ButtonProps['variant']
  /** Показывать разделитель "Или" сверху */
  showSeparator?: boolean
  /** Текст разделителя */
  separatorText?: string
  /** Кастомный текст кнопки: (provider) => string */
  getButtonLabel?: (provider: OAuthProvider) => string
}

/**
 * Дефолтные иконки провайдеров
 */
const defaultIcons: Record<OAuthProvider, ReactNode> = {
  google: <GoogleIcon />,
  yandex: <YandexIcon />,
  github: <GitHubIcon />,
  telegram: <TelegramIcon />,
  vk: <VKIcon />,
  facebook: <FacebookIcon />,
}

/**
 * Дефолтные названия провайдеров
 */
const defaultLabels: Record<OAuthProvider, string> = {
  google: 'Google',
  yandex: 'Яндекс',
  github: 'GitHub',
  telegram: 'Telegram',
  vk: 'ВКонтакте',
  facebook: 'Facebook',
}

/**
 * Провайдеры, использующие signIn.social (нативные в Better Auth)
 */
const socialProviders = new Set<OAuthProvider>(['google', 'github', 'vk', 'facebook'])

/**
 * Провайдеры, использующие signIn.oauth2 (через genericOAuth плагин)
 */
const oauth2Providers = new Set<OAuthProvider>(['yandex'])

/**
 * Создаёт компонент OAuthButtons с привязкой к authClient
 *
 * @example
 * ```tsx
 * // apps/my-app/src/lib/auth-client.ts
 * import { createAuthClientWithOAuth, createOAuthButtons } from '@letar/auth/client'
 *
 * export const authClient = createAuthClientWithOAuth()
 * export const OAuthButtons = createOAuthButtons(authClient)
 *
 * // Использование
 * <OAuthButtons
 *   providers={['google', 'yandex']}
 *   callbackUrl="/dashboard"
 * />
 * ```
 */
export function createOAuthButtons(authClient: AuthClientWithOAuth) {
  return function OAuthButtons({
    callbackUrl = '/',
    providers = ['google', 'yandex'],
    direction = 'vertical',
    size = 'lg',
    variant = 'outline',
    showSeparator = false,
    separatorText = 'или',
    getButtonLabel,
    ...stackProps
  }: OAuthButtonsProps): JSX.Element {
    const [loadingProvider, setLoadingProvider] = useState<OAuthProvider | null>(null)

    const handleProviderClick = useCallback(
      async (provider: OAuthProvider) => {
        setLoadingProvider(provider)
        try {
          if (socialProviders.has(provider)) {
            await authClient.signIn.social({
              provider: provider as 'google' | 'github' | 'vk' | 'facebook',
              callbackURL: callbackUrl,
            })
          } else if (oauth2Providers.has(provider)) {
            await authClient.signIn.oauth2({
              providerId: provider,
              callbackURL: callbackUrl,
            })
          }
          // telegram — пока не поддерживается
        } catch (error) {
          console.error(`[OAuth] Error signing in with ${provider}:`, error)
          setLoadingProvider(null)
        }
      },
      [callbackUrl],
    )

    // Нормализуем провайдеров в единый формат
    const normalizedProviders: OAuthProviderConfig[] = providers.map((p) => (typeof p === 'string' ? { id: p } : p))

    const getLabel = (provider: OAuthProvider): string => {
      if (getButtonLabel) {
        return getButtonLabel(provider)
      }
      return `Продолжить с ${defaultLabels[provider]}`
    }

    return (
      <>
        {showSeparator && (
          <Stack direction="row" align="center" gap={4} my={4}>
            <Separator flex={1} />
            <Text color="fg.muted" fontSize="sm">
              {separatorText}
            </Text>
            <Separator flex={1} />
          </Stack>
        )}
        <Stack direction={direction === 'horizontal' ? 'row' : 'column'} gap={3} width="full" {...stackProps}>
          {normalizedProviders.map((config) => {
            const isLoading = loadingProvider === config.id
            const isDisabled = config.disabled || loadingProvider !== null
            const icon = config.icon ?? defaultIcons[config.id]
            const label = config.label ?? getLabel(config.id)

            return (
              <Button
                key={config.id}
                type="button"
                variant={variant}
                size={size}
                width="full"
                loading={isLoading}
                disabled={isDisabled}
                onClick={() => handleProviderClick(config.id)}
              >
                {icon}
                {label}
              </Button>
            )
          })}
        </Stack>
      </>
    )
  }
}
