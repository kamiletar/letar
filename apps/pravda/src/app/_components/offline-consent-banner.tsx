'use client'

import { Box, Button, CloseButton, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useOfflineConsent } from '@letar/hooks'
import { useEffect, useState } from 'react'
import { LuDownload, LuWifiOff } from 'react-icons/lu'

/**
 * Banner запроса согласия на оффлайн режим.
 *
 * Показывается внизу экрана при первом посещении или через 7 дней после отказа.
 * При согласии регистрируется Service Worker и кэшируются документы.
 */
export function OfflineConsentBanner() {
  const { shouldShowBanner, accept, decline } = useOfflineConsent('pravda-offline-consent')
  const [isVisible, setIsVisible] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Задержка перед показом banner для UX
  useEffect(() => {
    setIsReady(true)
    if (shouldShowBanner) {
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 2000) // Показываем через 2 секунды после загрузки
      return () => clearTimeout(timer)
    }
    return undefined
  }, [shouldShowBanner])

  // Не рендерим до гидратации
  if (!isReady) {
    return null
  }

  // Не показываем если не нужно
  if (!shouldShowBanner || !isVisible) {
    return null
  }

  /**
   * Обработчик принятия оффлайн режима.
   */
  const handleAccept = () => {
    accept()
    setIsVisible(false)
  }

  /**
   * Обработчик отклонения оффлайн режима.
   */
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
      // Анимация появления
      animation="slideUp 0.3s ease-out"
      css={{
        '@keyframes slideUp': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      }}
    >
      <VStack gap={3} align="stretch" maxW="container.md" mx="auto">
        {/* Заголовок с иконкой и кнопкой закрытия */}
        <HStack justify="space-between" align="start">
          <HStack gap={3} align="start">
            <Icon as={LuDownload} boxSize={5} color="brand.500" mt={0.5} />
            <VStack align="start" gap={0.5}>
              <Text fontWeight="semibold" fontSize="sm">
                Читайте законы без интернета
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Сохраните все документы для оффлайн доступа (~5 MB)
              </Text>
            </VStack>
          </HStack>
          <CloseButton size="sm" onClick={handleDecline} aria-label="Закрыть" />
        </HStack>

        {/* Описание преимуществ */}
        <HStack gap={2} color="fg.muted" fontSize="xs" flexWrap="wrap">
          <HStack gap={1}>
            <Icon as={LuWifiOff} boxSize={3} />
            <Text>Работает без интернета</Text>
          </HStack>
          <Text>•</Text>
          <Text>22 документа</Text>
          <Text>•</Text>
          <Text>Полнотекстовый поиск</Text>
        </HStack>

        {/* Кнопки действий */}
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
