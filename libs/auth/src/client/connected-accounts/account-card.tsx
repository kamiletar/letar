'use client'

import { Badge, Box, Button, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { AccountBase } from '../../types'
import type { OAuthProvider } from '../oauth-buttons'
import { providerColors, providerNames } from './provider-config'

interface AccountCardProps {
  /** ID провайдера */
  providerId: OAuthProvider
  /** Связанный аккаунт (если есть) */
  linkedAccount?: AccountBase
  /** Иконка провайдера */
  icon: ReactNode
  /** Можно ли отвязать аккаунт */
  canUnlink: boolean
  /** Состояние загрузки */
  loading: boolean
  /** Обработчик привязки */
  onLink: (providerId: OAuthProvider) => void
  /** Обработчик отвязки */
  onUnlink: (providerId: OAuthProvider) => void
  /** Кастомный виджет для привязки (например, Telegram Widget) */
  customLinkWidget?: ReactNode
}

/**
 * Карточка OAuth провайдера
 *
 * Отображает статус привязки и кнопки действий
 */
export function AccountCard({
  providerId,
  linkedAccount,
  icon,
  canUnlink,
  loading,
  onLink,
  onUnlink,
  customLinkWidget,
}: AccountCardProps) {
  const color = providerColors[providerId]
  const name = providerNames[providerId]
  const isLinked = !!linkedAccount

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <HStack justify="space-between">
        <HStack gap={3}>
          <Icon fontSize="xl" color={`${color}.500`}>
            {icon}
          </Icon>
          <VStack align="start" gap={0}>
            <Text fontWeight="semibold">{name}</Text>
            {linkedAccount && (
              <Text fontSize="sm" color="gray.600" _dark={{ color: 'gray.400' }}>
                ID: {linkedAccount.accountId}
              </Text>
            )}
          </VStack>
        </HStack>

        {isLinked ? (
          <HStack gap={2}>
            <Badge colorPalette="green">Подключено</Badge>
            <Button
              size="sm"
              variant="ghost"
              colorPalette="red"
              onClick={() => onUnlink(providerId)}
              loading={loading}
              disabled={!canUnlink}
            >
              Отключить
            </Button>
          </HStack>
        ) : (
          customLinkWidget || (
            <Button size="sm" colorPalette={color} onClick={() => onLink(providerId)} loading={loading}>
              Подключить
            </Button>
          )
        )}
      </HStack>

      {isLinked && !canUnlink && (
        <Text fontSize="xs" color="orange.600" _dark={{ color: 'orange.400' }} mt={2}>
          Это ваш единственный способ входа. Установите пароль или подключите другой аккаунт перед отключением.
        </Text>
      )}
    </Box>
  )
}
