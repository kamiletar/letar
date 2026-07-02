'use client'

import { Box, Button, CloseButton, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useOfflineConsent } from '@letar/hooks'
import { useEffect, useState } from 'react'
import { LuDownload, LuWifiOff } from 'react-icons/lu'

/**
 * Banner запроса согласия на оффлайн режим.
 *
 * Показывается внизу экрана при первом посещении или через 7 дней после отказа.
 * При согласии регистрируется Service Worker и кэшируются страницы и изображения.
 */
export function OfflineConsentBanner() {
  const { shouldShowBanner, accept, decline } = useOfflineConsent('grandslamcup-offline-consent')
  const [isVisible, setIsVisible] = useState(false)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    setIsReady(true)
    if (shouldShowBanner) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [shouldShowBanner])

  if (!isReady || !shouldShowBanner || !isVisible) {
    return null
  }

  const handleAccept = () => {
    accept()
    setIsVisible(false)
  }

  const handleDecline = () => {
    decline()
    setIsVisible(false)
  }

  return (
    <Box
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      p={4}
      zIndex="banner"
      shadow="lg"
      animation="slideUp 0.3s ease-out"
      css={{
        '@keyframes slideUp': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      }}
    >
      <VStack gap={3} align="stretch" maxW="container.md" mx="auto">
        <HStack justify="space-between" align="start">
          <HStack gap={3} align="start">
            <Icon as={LuDownload} boxSize={5} color="brand.500" mt={0.5} />
            <VStack align="start" gap={0.5}>
              <Text fontWeight="semibold" fontSize="sm">
                Включить оффлайн-доступ?
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Приложение сохранит расписание, таблицы и профили для просмотра без интернета
              </Text>
            </VStack>
          </HStack>
          <CloseButton size="sm" onClick={handleDecline} aria-label="Закрыть" />
        </HStack>

        <HStack gap={2} color="fg.muted" fontSize="xs" flexWrap="wrap">
          <HStack gap={1}>
            <Icon as={LuWifiOff} boxSize={3} />
            <Text>Работает без сети</Text>
          </HStack>
          <Text>•</Text>
          <Text>Займёт немного места в хранилище браузера</Text>
        </HStack>

        <HStack gap={3} justify="flex-end">
          <Button variant="ghost" size="sm" onClick={handleDecline}>
            Не сейчас
          </Button>
          <Button colorPalette="brand" size="sm" onClick={handleAccept}>
            Включить оффлайн
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
