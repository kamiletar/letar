'use client'

import { Alert, Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { FaEnvelope } from 'react-icons/fa'
import type { AccountBase, UnlinkAccountResult } from '../../types'
import { FacebookIcon } from '../icons/facebook-icon'
import { GitHubIcon } from '../icons/github-icon'
import { GoogleIcon } from '../icons/google-icon'
import { TelegramIcon } from '../icons/telegram-icon'
import { VKIcon } from '../icons/vk-icon'
import { YandexIcon } from '../icons/yandex-icon'
import type { OAuthProvider } from '../oauth-buttons'
import { AccountCard } from './account-card'

/**
 * Иконки провайдеров по умолчанию
 */
const defaultProviderIcons: Record<OAuthProvider, ReactNode> = {
  google: <GoogleIcon />,
  yandex: <YandexIcon />,
  github: <GitHubIcon />,
  telegram: <TelegramIcon />,
  vk: <VKIcon />,
  facebook: <FacebookIcon />,
}

export interface ConnectedAccountsListProps {
  /** Список связанных аккаунтов пользователя */
  accounts: AccountBase[]
  /** Есть ли у пользователя установленный пароль */
  hasPassword: boolean
  /** Email пользователя */
  userEmail: string
  /** Список провайдеров для отображения (по умолчанию все) */
  providers?: OAuthProvider[]
  /** URL для редиректа после привязки */
  linkCallbackUrl?: string
  /** URL страницы установки пароля */
  changePasswordUrl?: string
  /** Обработчик отвязки аккаунта */
  onUnlink: (providerId: string) => Promise<UnlinkAccountResult>
  /** Кастомный виджет для Telegram (TelegramLinkButton) */
  telegramWidget?: ReactNode
  /** Кастомные иконки провайдеров (переопределяют дефолтные) */
  providerIcons?: Partial<Record<OAuthProvider, ReactNode>>
}

/**
 * Список связанных OAuth аккаунтов
 *
 * Переиспользуемый компонент для страницы привязки аккаунтов.
 * Поддерживает привязку/отвязку OAuth провайдеров и отображение статуса пароля.
 *
 * @example
 * ```tsx
 * <ConnectedAccountsList
 *   accounts={accounts}
 *   hasPassword={hasPassword}
 *   userEmail={user.email}
 *   providers={['google', 'yandex', 'vk']}
 *   linkCallbackUrl="/settings/connected-accounts"
 *   onUnlink={unlinkAccountAction}
 * />
 * ```
 */
export function ConnectedAccountsList({
  accounts,
  hasPassword,
  userEmail,
  providers = ['google', 'yandex', 'vk', 'telegram'],
  linkCallbackUrl = '/settings/connected-accounts',
  changePasswordUrl = '/settings/change-password',
  onUnlink,
  telegramWidget,
  providerIcons,
}: ConnectedAccountsListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string>('')

  // Объединяем дефолтные и кастомные иконки
  const icons: Record<OAuthProvider, ReactNode> = {
    ...defaultProviderIcons,
    ...providerIcons,
  }

  /**
   * Привязка OAuth аккаунта через редирект
   */
  const handleLink = async (providerId: OAuthProvider) => {
    setLoading(providerId)
    setError('')

    try {
      // Better Auth: редирект на OAuth провайдер
      router.push(`/api/auth/signin/${providerId}?callbackURL=${encodeURIComponent(linkCallbackUrl)}`)
    } catch (err) {
      console.error('[ConnectedAccountsList] Link error:', err)
      setError('Не удалось связать аккаунт')
      setLoading(null)
    }
  }

  /**
   * Отвязка OAuth аккаунта
   */
  const handleUnlink = async (providerId: OAuthProvider) => {
    const providerName = providerId === 'vk' ? 'ВКонтакте' : providerId
    // Проверка на браузерное окружение для SSR совместимости
    if (typeof window !== 'undefined' && !window.confirm(`Вы уверены, что хотите отвязать ${providerName}?`)) {
      return
    }

    setLoading(providerId)
    setError('')

    try {
      const result = await onUnlink(providerId)

      if (!result.success) {
        setError(result.error || 'Не удалось отвязать аккаунт')
      }
    } catch (err) {
      console.error('[ConnectedAccountsList] Unlink error:', err)
      setError('Не удалось отвязать аккаунт')
    } finally {
      setLoading(null)
    }
  }

  /**
   * Проверка можно ли отвязать провайдер
   * Нельзя отвязать если это единственный способ входа
   */
  const canUnlink = (_providerId: string) => {
    // Не считаем credential как способ входа (он учитывается в hasPassword)
    const nonCredentialAccounts = accounts.filter((acc) => acc.providerId !== 'credential')
    const totalLoginMethods = nonCredentialAccounts.length + (hasPassword ? 1 : 0)
    return totalLoginMethods > 1
  }

  return (
    <VStack align="stretch" gap={4}>
      {error && (
        <Alert.Root status="error">
          <Alert.Title>{error}</Alert.Title>
        </Alert.Root>
      )}

      {/* Карточка Email + пароль */}
      <Box
        borderWidth="1px"
        borderRadius="lg"
        p={4}
        bg={hasPassword ? 'green.50' : 'orange.50'}
        _dark={{
          bg: hasPassword ? 'green.900' : 'orange.900',
        }}
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <Icon fontSize="xl">
              <FaEnvelope />
            </Icon>
            <VStack align="start" gap={0}>
              <Text fontWeight="semibold">Email + пароль</Text>
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                {userEmail}
              </Text>
            </VStack>
          </HStack>

          {hasPassword ? (
            <Badge colorPalette="green">Установлен</Badge>
          ) : (
            <Button asChild size="sm" colorPalette="orange" variant="outline">
              <a href={changePasswordUrl}>Установить пароль</a>
            </Button>
          )}
        </HStack>
      </Box>

      {/* Карточки OAuth провайдеров */}
      <VStack align="stretch" gap={3}>
        {providers.map((providerId) => {
          const linkedAccount = accounts.find((acc) => acc.providerId === providerId)

          return (
            <AccountCard
              key={providerId}
              providerId={providerId}
              linkedAccount={linkedAccount}
              icon={icons[providerId]}
              canUnlink={canUnlink(providerId)}
              loading={loading === providerId}
              onLink={handleLink}
              onUnlink={handleUnlink}
              customLinkWidget={providerId === 'telegram' ? telegramWidget : undefined}
            />
          )
        })}
      </VStack>

      {/* Информационный блок */}
      <Box borderWidth="1px" borderRadius="lg" p={4} bg="blue.50" _dark={{ bg: 'blue.900' }}>
        <Text fontSize="sm" color="gray.700" _dark={{ color: 'gray.300' }}>
          <strong>Совет:</strong> Подключите несколько способов входа для большей безопасности и удобства. Если один
          способ будет недоступен, вы всегда сможете войти через другой.
        </Text>
      </Box>
    </VStack>
  )
}
