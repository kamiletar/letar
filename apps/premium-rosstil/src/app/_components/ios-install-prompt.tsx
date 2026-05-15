'use client'

import { Box, Button, CloseButton, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { HiOutlinePlusCircle } from 'react-icons/hi'
import { IoShareOutline } from 'react-icons/io5'

const STORAGE_KEY = 'ios-install-prompt-dismissed'
const DISMISS_DURATION_DAYS = 30

function isIOS(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const userAgent = window.navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod/.test(userAgent)
}

function isInStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return (
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone) ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

function isDismissed(): boolean {
  if (typeof window === 'undefined') {
    return true
  }

  const dismissed = localStorage.getItem(STORAGE_KEY)
  if (!dismissed) {
    return false
  }

  const dismissedAt = parseInt(dismissed, 10)
  const now = Date.now()
  const daysSinceDismissed = (now - dismissedAt) / (1000 * 60 * 60 * 24)

  return daysSinceDismissed < DISMISS_DURATION_DAYS
}

export function IOSInstallPrompt() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show prompt only on iOS, not in standalone mode, and not dismissed recently
    if (!isIOS() || isInStandaloneMode() || isDismissed()) {
      return
    }

    // Delay showing the prompt to not interrupt initial page load
    const timer = setTimeout(() => {
      setIsVisible(true)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setIsVisible(false)
  }

  if (!isVisible) {
    return null
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
    >
      <VStack gap={3} align="stretch">
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <Text fontWeight="semibold" fontSize="sm">
              Установите приложение
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Добавьте на главный экран для быстрого доступа
            </Text>
          </VStack>
          <CloseButton size="sm" onClick={handleDismiss} />
        </HStack>

        <VStack align="start" gap={2} bg="bg.subtle" p={3} borderRadius="md" fontSize="sm">
          <HStack gap={2}>
            <Box
              bg="blue.500"
              color="white"
              p={1}
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={IoShareOutline} boxSize={4} />
            </Box>
            <Text>
              Нажмите{' '}
              <Text as="span" fontWeight="semibold">
                Поделиться
              </Text>{' '}
              внизу экрана
            </Text>
          </HStack>

          <HStack gap={2}>
            <Box
              bg="gray.500"
              color="white"
              p={1}
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={HiOutlinePlusCircle} boxSize={4} />
            </Box>
            <Text>
              Выберите{' '}
              <Text as="span" fontWeight="semibold">
                На экран «Домой»
              </Text>
            </Text>
          </HStack>
        </VStack>

        <Button size="sm" variant="ghost" colorPalette="fg" onClick={handleDismiss}>
          Не сейчас
        </Button>
      </VStack>
    </Box>
  )
}
