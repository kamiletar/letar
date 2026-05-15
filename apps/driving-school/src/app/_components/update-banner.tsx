'use client'

import { useServiceWorker } from '@/hooks'
import { Box, Button, CloseButton, HStack, Icon, Portal, Text } from '@chakra-ui/react'
import { LuRefreshCw } from 'react-icons/lu'

/**
 * Баннер уведомления об обновлении приложения
 *
 * Появляется когда Service Worker обнаружил новую версию.
 * Позволяет пользователю обновить приложение или отклонить уведомление.
 */
export function UpdateBanner() {
  const { updateAvailable, applyUpdate, dismissUpdate } = useServiceWorker()

  if (!updateAvailable) {
    return null
  }

  return (
    <Portal>
      <Box
        position="fixed"
        top={4}
        left="50%"
        transform="translateX(-50%)"
        zIndex="toast"
        maxW="sm"
        w="calc(100% - 32px)"
      >
        <Box bg="brand.600" color="white" py={3} px={4} borderRadius="lg" boxShadow="xl">
          <HStack justify="space-between" align="center" gap={3}>
            <HStack gap={2} flex={1}>
              <Icon boxSize={5}>
                <LuRefreshCw />
              </Icon>
              <Text fontSize="sm" fontWeight="medium">
                Доступна новая версия
              </Text>
            </HStack>

            <HStack gap={2}>
              <Button size="sm" colorPalette="whiteAlpha" variant="solid" onClick={applyUpdate}>
                Обновить
              </Button>
              <CloseButton
                size="sm"
                color="whiteAlpha.800"
                _hover={{ color: 'white', bg: 'whiteAlpha.200' }}
                onClick={dismissUpdate}
                aria-label="Закрыть"
              />
            </HStack>
          </HStack>
        </Box>
      </Box>
    </Portal>
  )
}
