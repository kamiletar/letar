'use client'

import { Box, Button, CloseButton, HStack, Text, VStack } from '@chakra-ui/react'
import { useOfflineConsent } from '@letar/hooks'
import { Fragment, useEffect, useState } from 'react'
import { LuDownload, LuWifiOff } from 'react-icons/lu'

export interface OfflineConsentBannerProps {
  /** Namespace-ключ для {@link useOfflineConsent} (localStorage), например `'studio-offline-consent'` */
  consentKey: string
  /** Заголовок баннера */
  title: string
  /** Пояснение под заголовком */
  description: string
  /**
   * Короткие пункты преимуществ оффлайн-режима (например «Работает без сети», «22 документа»).
   * Первый пункт получает иконку {@link LuWifiOff}, остальные разделяются точкой.
   */
  features: string[]
  /** Цветовая палитра иконки и кнопки принятия — по умолчанию `'brand'` */
  colorPalette?: string
  /** Задержка перед показом баннера после гидратации, мс */
  delayMs?: number
  /**
   * Дополнительное условие показа сверх согласия (например «пользователь уже заходил в кабинет»).
   * Вычисляется на клиенте после монтирования — без пропа баннер показывается сразу.
   */
  isEligible?: () => boolean
  closeLabel?: string
  notNowLabel?: string
  enableLabel?: string
}

/**
 * Баннер запроса согласия на оффлайн-режим — появляется через `delayMs` после загрузки,
 * приподнимается над {@link CookieBanner}, когда тот показан (см. `--letar-cookie-banner-height`,
 * .claude/docs/ui-components.md § «Координация bottom-anchored компонентов»).
 */
export function OfflineConsentBanner({
  consentKey,
  title,
  description,
  features,
  colorPalette = 'brand',
  delayMs = 2000,
  isEligible,
  closeLabel = 'Закрыть',
  notNowLabel = 'Не сейчас',
  enableLabel = 'Включить оффлайн',
}: OfflineConsentBannerProps) {
  const { shouldShowBanner, accept, decline } = useOfflineConsent(consentKey)
  const [isVisible, setIsVisible] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [eligible, setEligible] = useState(!isEligible)

  useEffect(() => {
    if (isEligible) {
      setEligible(isEligible())
    }
  }, [isEligible])

  useEffect(() => {
    setIsReady(true)
    if (shouldShowBanner && eligible) {
      const timer = setTimeout(() => setIsVisible(true), delayMs)
      return () => clearTimeout(timer)
    }
    return undefined
  }, [shouldShowBanner, eligible, delayMs])

  if (!isReady || !shouldShowBanner || !eligible || !isVisible) {
    return null
  }

  function handleAccept() {
    accept()
    setIsVisible(false)
  }

  function handleDecline() {
    decline()
    setIsVisible(false)
  }

  return (
    <Box
      position="fixed"
      bottom="var(--letar-cookie-banner-height, 0px)"
      left={0}
      right={0}
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      p={4}
      zIndex="banner"
      shadow="lg"
      animation="slideUp 0.3s ease-out"
      css={{ '@keyframes slideUp': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } } }}
    >
      <VStack gap={3} align="stretch" maxW="container.md" mx="auto">
        <HStack justify="space-between" align="start">
          <HStack gap={3} align="start">
            <LuDownload size={20} color={`var(--chakra-colors-${colorPalette}-solid)`} style={{ marginTop: 2 }} />
            <VStack align="start" gap={0.5}>
              <Text fontWeight="semibold" fontSize="sm">
                {title}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {description}
              </Text>
            </VStack>
          </HStack>
          <CloseButton size="sm" onClick={handleDecline} aria-label={closeLabel} />
        </HStack>

        <HStack gap={2} color="fg.muted" fontSize="xs" flexWrap="wrap">
          {features.map((feature, index) => (
            <Fragment key={feature}>
              {index === 0
                ? (
                  <HStack gap={1}>
                    <LuWifiOff size={12} />
                    <Text>{feature}</Text>
                  </HStack>
                )
                : (
                  <>
                    <Text>•</Text>
                    <Text>{feature}</Text>
                  </>
                )}
            </Fragment>
          ))}
        </HStack>

        <HStack gap={3} justify="flex-end">
          <Button variant="ghost" size="sm" onClick={handleDecline}>
            {notNowLabel}
          </Button>
          <Button colorPalette={colorPalette} size="sm" onClick={handleAccept}>
            {enableLabel}
          </Button>
        </HStack>
      </VStack>
    </Box>
  )
}
