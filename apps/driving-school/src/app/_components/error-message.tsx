'use client'

import { Box, type BoxProps, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { LuCircleAlert, LuRefreshCw } from 'react-icons/lu'

/**
 * Варианты отображения ошибки
 */
export type ErrorMessageVariant = 'inline' | 'page'

export interface ErrorMessageProps extends Omit<BoxProps, 'title'> {
  /**
   * Заголовок ошибки (по умолчанию "Ошибка")
   */
  title?: string

  /**
   * Текст ошибки или React node
   */
  message: React.ReactNode

  /**
   * Вариант отображения
   * - inline: компактный вариант для форм и небольших блоков
   * - page: полноразмерный вариант для страниц
   * @default 'page'
   */
  variant?: ErrorMessageVariant

  /**
   * Показать кнопку повтора
   */
  onRetry?: () => void

  /**
   * Текст кнопки повтора
   * @default 'Попробовать снова'
   */
  retryText?: string

  /**
   * Показать иконку
   * @default true
   */
  showIcon?: boolean
}

/**
 * Унифицированный компонент для отображения ошибок
 *
 * @example
 * // Inline вариант (для форм)
 * <ErrorMessage
 *   variant="inline"
 *   message="Неверный email или пароль"
 * />
 *
 * @example
 * // Page вариант (для страниц)
 * <ErrorMessage
 *   title="Не удалось загрузить данные"
 *   message="Проверьте подключение к интернету"
 *   onRetry={() => router.refresh()}
 * />
 */
export function ErrorMessage({
  title = 'Ошибка',
  message,
  variant = 'page',
  onRetry,
  retryText = 'Попробовать снова',
  showIcon = true,
  ...boxProps
}: ErrorMessageProps) {
  if (variant === 'inline') {
    return (
      <Box layerStyle="panel.error" p={3} borderRadius="md" role="alert" aria-live="assertive" {...boxProps}>
        <HStack gap={2} align="start">
          {showIcon && (
            <Box color="error.fg" flexShrink={0} mt={0.5}>
              <LuCircleAlert size={16} aria-hidden="true" />
            </Box>
          )}
          <Text fontSize="sm" color="error.fg">
            {message}
          </Text>
        </HStack>
      </Box>
    )
  }

  // Page вариант
  return (
    <Box
      layerStyle="panel.error"
      p={6}
      borderRadius="lg"
      textAlign="center"
      role="alert"
      aria-live="assertive"
      {...boxProps}
    >
      <VStack gap={3}>
        {showIcon && (
          <Box color="error.fg">
            <LuCircleAlert size={32} aria-hidden="true" />
          </Box>
        )}

        <Heading size="lg" color="error.fg">
          {title}
        </Heading>

        <Text color="error.fg">{message}</Text>

        {onRetry && (
          <Button variant="outline" colorPalette="error" onClick={onRetry} mt={2}>
            <LuRefreshCw size={16} aria-hidden="true" />
            {retryText}
          </Button>
        )}
      </VStack>
    </Box>
  )
}

/**
 * Словарь типичных ошибок для удобства
 */
export const ERROR_MESSAGES = {
  // Авторизация
  UNAUTHORIZED: 'Необходимо войти в систему',
  FORBIDDEN: 'Нет доступа к этому ресурсу',

  // Роли
  NOT_INSTRUCTOR: 'Необходима роль инструктора',
  NOT_STUDENT: 'Необходима роль ученика',
  NOT_SCHOOL_ADMIN: 'Нет доступа к этой школе',
  NOT_OWNER: 'Необходимы права владельца',

  // Данные
  NOT_FOUND: 'Данные не найдены',
  NO_PROFILE: 'Профиль не найден',
  NO_SCHOOL: 'Школа не найдена',

  // Сеть
  NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету',
  SERVER_ERROR: 'Ошибка сервера. Попробуйте позже',

  // Общие
  UNKNOWN_ERROR: 'Произошла неизвестная ошибка',
  VALIDATION_ERROR: 'Проверьте правильность введённых данных',
} as const

/**
 * Получить текст ошибки по коду
 *
 * @example
 * const errorText = getErrorMessage('NOT_FOUND', 'Пользователь не найден')
 */
export function getErrorMessage(code: string | undefined, fallback = ERROR_MESSAGES.UNKNOWN_ERROR): string {
  if (!code) {
    return fallback
  }

  return (ERROR_MESSAGES as Record<string, string>)[code] ?? fallback
}
