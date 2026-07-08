'use client'

import { Box, Button, CloseButton, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useOfflineConsent } from '@letar/hooks'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { LuDownload, LuWifiOff } from 'react-icons/lu'

/**
 * Баннер согласия на оффлайн-режим (этап 5.7, фестивальный /express).
 *
 * Показывается внизу экрана через 2 секунды после загрузки; при отказе
 * повторный показ через 7 дней (логика в useOfflineConsent). Без согласия
 * Service Worker не регистрируется — прекэш статики молча запрещён.
 */
export function OfflineConsentBanner() {
  const t = useTranslations('offlineBanner')
  const { shouldShowBanner, accept, decline } = useOfflineConsent('archetest-offline-consent')
  const [isVisible, setIsVisible] = useState(false)
  const [isReady, setIsReady] = useState(false)

  // Задержка перед показом — не перебивать первый контакт со страницей
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

  // Не рендерим до гидратации и без необходимости
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
            <Icon boxSize={5} color="purple.500" mt={0.5}>
              <LuDownload />
            </Icon>
            <VStack align="start" gap={0.5}>
              <Text fontWeight="semibold" fontSize="sm">
                {t('title')}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {t('subtitle')}
              </Text>
            </VStack>
          </HStack>
          <CloseButton size="sm" onClick={handleDecline} aria-label={t('close')} />
        </HStack>

        <HStack gap={2} color="fg.muted" fontSize="xs" flexWrap="wrap">
          <HStack gap={1}>
            <Icon boxSize={3}>
              <LuWifiOff />
            </Icon>
            <Text>{t('worksOffline')}</Text>
          </HStack>
          <Text>•</Text>
          <Text>{t('expressAvailable')}</Text>
          <Text>•</Text>
          <Text>{t('localResults')}</Text>
        </HStack>

        <HStack gap={3} justify="flex-end">
          <Button variant="ghost" size="sm" onClick={handleDecline}>
            {t('notNow')}
          </Button>
          <Button colorPalette="purple" size="sm" onClick={handleAccept}>
            {t('enableOffline')}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
