/**
 * Компонент для отображения ошибок с кнопкой retry
 */

import { Box, Text, VStack } from '@chakra-ui/react'
import { LuRefreshCw, LuTriangleAlert, LuWifiOff } from 'react-icons/lu'

interface ErrorStateProps {
  /** Тип ошибки для выбора иконки */
  type?: 'network' | 'error' | 'empty'
  /** Заголовок ошибки */
  title?: string
  /** Описание ошибки */
  message?: string
  /** Callback для retry */
  onRetry?: () => void
  /** Текст кнопки retry */
  retryText?: string
}

export function ErrorState({
  type = 'error',
  title = 'Произошла ошибка',
  message,
  onRetry,
  retryText = 'Повторить',
}: ErrorStateProps) {
  const Icon = type === 'network' ? LuWifiOff : LuTriangleAlert

  return (
    <VStack gap={4} py={12} textAlign="center">
      <Box p={4} borderRadius="full" bg="red.900/30" color="red.400">
        <Icon size={32} />
      </Box>

      <VStack gap={1}>
        <Text color="gray.200" fontWeight="semibold" fontSize="lg">
          {title}
        </Text>
        {message && (
          <Text color="gray.500" fontSize="sm" maxW="280px">
            {message}
          </Text>
        )}
      </VStack>

      {onRetry && (
        <Box
          as="button"
          display="flex"
          alignItems="center"
          gap={2}
          px={5}
          py={3}
          minH="44px"
          bg="purple.600"
          color="white"
          borderRadius="lg"
          fontWeight="medium"
          transition="all 0.2s"
          _hover={{ bg: 'purple.500' }}
          _active={{ transform: 'scale(0.98)' }}
          onClick={onRetry}
        >
          <LuRefreshCw size={18} />
          {retryText}
        </Box>
      )}
    </VStack>
  )
}
