/**
 * OfflineIndicator — индикатор потери соединения
 *
 * Показывает banner когда потеряно соединение с desktop приложением.
 */

import { Box, Flex, Text } from '@chakra-ui/react'
import { LuRefreshCw, LuWifiOff } from 'react-icons/lu'

import type { NetworkStatus } from '../hooks/useNetworkStatus'

interface OfflineIndicatorProps {
  /** Статус сети */
  status: NetworkStatus
  /** Callback при нажатии "Повторить" */
  onRetry?: () => void
}

export function OfflineIndicator({ status, onRetry }: OfflineIndicatorProps) {
  const { isOnline, isDesktopConnected } = status

  // Не показываем если всё хорошо
  if (isOnline && isDesktopConnected) {
    return null
  }

  // Определяем тип проблемы
  const isFullyOffline = !isOnline
  const isDesktopOnly = isOnline && !isDesktopConnected

  const message = isFullyOffline ? 'Нет подключения к интернету' : 'Нет связи с Animatrona'

  const subMessage = isDesktopOnly ? 'Проверьте, что приложение запущено на компьютере' : undefined

  return (
    <Box
      position="fixed"
      top={0}
      left={0}
      right={0}
      bg={isFullyOffline ? 'red.900/95' : 'orange.900/95'}
      backdropFilter="blur(8px)"
      px={4}
      py={3}
      zIndex={1000}
      animation="slideDown 0.3s ease-out"
      css={{
        '@keyframes slideDown': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
      }}
    >
      {/* Safe area padding для notch */}
      <Box pt="env(safe-area-inset-top)" />

      <Flex align="center" gap={3}>
        {/* Иконка */}
        <Box
          w="36px"
          h="36px"
          borderRadius="full"
          bg={isFullyOffline ? 'red.800' : 'orange.800'}
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
        >
          <LuWifiOff size={18} color="white" />
        </Box>

        {/* Текст */}
        <Box flex={1}>
          <Text fontWeight="semibold" fontSize="sm" color="white">
            {message}
          </Text>
          {subMessage && (
            <Text fontSize="xs" color={isFullyOffline ? 'red.200' : 'orange.200'}>
              {subMessage}
            </Text>
          )}
        </Box>

        {/* Кнопка повторить */}
        {onRetry && (
          <Box
            as="button"
            px={3}
            py={2}
            borderRadius="lg"
            bg={isFullyOffline ? 'red.700' : 'orange.700'}
            color="white"
            fontSize="sm"
            fontWeight="medium"
            display="flex"
            alignItems="center"
            gap={2}
            minH="40px"
            onClick={onRetry}
            transition="all 0.2s"
            _hover={{ bg: isFullyOffline ? 'red.600' : 'orange.600' }}
            _active={{ transform: 'scale(0.95)' }}
          >
            <LuRefreshCw size={14} />
            Повторить
          </Box>
        )}
      </Flex>
    </Box>
  )
}

/**
 * Компонент-обёртка для контента с учётом offline banner
 */
interface OfflineAwareContainerProps {
  children: React.ReactNode
  status: NetworkStatus
  onRetry?: () => void
}

export function OfflineAwareContainer({ children, status, onRetry }: OfflineAwareContainerProps) {
  const { isOnline, isDesktopConnected } = status
  const showBanner = !isOnline || !isDesktopConnected

  return (
    <>
      <OfflineIndicator status={status} onRetry={onRetry} />
      {/* Добавляем padding-top когда banner видимый */}
      <Box pt={showBanner ? 'calc(env(safe-area-inset-top) + 60px)' : 0} transition="padding 0.3s ease-out">
        {children}
      </Box>
    </>
  )
}
