/**
 * Кастомный toast для уведомлений об обновлениях
 *
 * Использует фирменный фиолетовый цвет и предоставляет
 * удобные действия для управления обновлениями
 */

'use client'

import { Box, Button, HStack, Icon, IconButton, Text, VStack } from '@chakra-ui/react'
import { LuDownload, LuInfo, LuX } from 'react-icons/lu'

interface UpdateNotificationToastProps {
  /** Версия обновления */
  version: string
  /** Краткое описание */
  description?: string
  /** Тип уведомления */
  type: 'available' | 'downloaded' | 'error'
  /** Сообщение об ошибке (для type=error) */
  errorMessage?: string
  /** Callback при нажатии "Подробнее" */
  onDetails?: () => void
  /** Callback при нажатии "Скачать" */
  onDownload?: () => void
  /** Callback при нажатии "Установить" */
  onInstall?: () => void
  /** Callback при закрытии */
  onClose?: () => void
}

/**
 * Компонент toast-уведомления об обновлении
 *
 * @example
 * ```tsx
 * <UpdateNotificationToast
 *   version="1.5.0"
 *   description="Исправления ошибок и улучшения"
 *   type="available"
 *   onDetails={() => setDrawerOpen(true)}
 *   onDownload={() => downloadUpdate()}
 *   onClose={() => toaster.dismiss(id)}
 * />
 * ```
 */
export function UpdateNotificationToast({
  version,
  description,
  type,
  errorMessage,
  onDetails,
  onDownload,
  onInstall,
  onClose,
}: UpdateNotificationToastProps) {
  // Определяем цветовую схему в зависимости от типа
  const colorScheme = type === 'error' ? 'red' : 'purple'
  const icon = type === 'available' ? LuDownload : type === 'downloaded' ? LuInfo : LuInfo

  // Заголовок
  const title = type === 'available'
    ? `Доступно обновление v${version}`
    : type === 'downloaded'
    ? `Обновление v${version} готово`
    : 'Ошибка обновления'

  // Описание
  const desc = type === 'error'
    ? errorMessage || 'Произошла ошибка при проверке обновлений'
    : type === 'downloaded'
    ? 'Приложение будет перезапущено для установки'
    : description || 'Исправления ошибок и улучшения'

  return (
    <Box
      bg="bg.panel"
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      shadow="lg"
      p="4"
      minW={{ base: '300px', md: '400px' }}
      position="relative"
    >
      {/* Акцентная полоска */}
      <Box position="absolute" top="0" left="0" right="0" h="3px" bg={`${colorScheme}.solid`} borderTopRadius="lg" />

      <HStack align="start" gap="3">
        {/* Иконка */}
        <Box p="2" bg={`${colorScheme}.subtle`} color={`${colorScheme}.fg`} borderRadius="md" flexShrink={0}>
          <Icon fontSize="xl" as={icon} />
        </Box>

        {/* Контент */}
        <VStack align="start" flex="1" gap="2">
          <Text fontWeight="semibold" fontSize="sm" lineHeight="short">
            {title}
          </Text>

          <Text fontSize="sm" color="fg.muted" lineHeight="short">
            {desc}
          </Text>

          {/* Действия */}
          {type !== 'error' && (
            <HStack gap="2" mt="1">
              {type === 'available' && (
                <>
                  {onDetails && (
                    <Button size="sm" variant="ghost" colorPalette={colorScheme} onClick={onDetails}>
                      Подробнее
                    </Button>
                  )}
                  {onDownload && (
                    <Button size="sm" variant="solid" colorPalette={colorScheme} onClick={onDownload}>
                      Скачать
                    </Button>
                  )}
                </>
              )}

              {type === 'downloaded' && onInstall && (
                <Button size="sm" variant="solid" colorPalette={colorScheme} onClick={onInstall}>
                  Установить сейчас
                </Button>
              )}
            </HStack>
          )}
        </VStack>

        {/* Кнопка закрытия */}
        {onClose && (
          <IconButton
            aria-label="Закрыть"
            size="sm"
            variant="ghost"
            colorPalette="gray"
            onClick={onClose}
            flexShrink={0}
          >
            <LuX />
          </IconButton>
        )}
      </HStack>
    </Box>
  )
}
