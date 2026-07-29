'use client'

import { Box, Button, Checkbox, Container, HStack, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { type CookieConsentState, createConsentConfig } from './consent-types'
import { usePublishedHeight } from './use-published-height'

/**
 * CSS-переменная с текущей высотой баннера (0, если он скрыт) — читает {@link StickyActionBar},
 * чтобы приподняться над баннером, а не прятаться под ним. Оба компонента `position: fixed/sticky;
 * bottom: 0` — без координации баннер (zIndex выше) визуально и по pointer-events перекрывает
 * CTA-кнопку под собой (archetest, express/mood-check-in.spec.ts, 2026-07-28: клики по «Начать
 * экспресс»/«Пропустить» перехватывала ссылка «Подробнее в политике ПДн» из баннера).
 */
const BANNER_HEIGHT_VAR = '--letar-cookie-banner-height'

export interface CookieBannerProps {
  /** Ключ приложения для namespace событий/localStorage, напр. 'auth-hub' */
  appKey: string
  /** URL политики конфиденциальности */
  privacyUrl?: string
  /** Версия политики — при изменении баннер показывается снова */
  policyVersion?: string
  /** URL для POST-логирования согласия в БД, null — не отправлять */
  consentApiUrl?: string | null
  /** Подпись категории аналитики */
  analyticsLabel?: string
  /** Подпись категории маркетинга */
  marketingLabel?: string
}

export function CookieBanner({
  appKey,
  privacyUrl = '/privacy',
  policyVersion = 'v1',
  consentApiUrl = '/api/consent',
  analyticsLabel = 'Аналитика (Я.Метрика)',
  marketingLabel = 'Маркетинг (ретаргетинг)',
}: CookieBannerProps) {
  const config = createConsentConfig(appKey, policyVersion)
  const [shown, setShown] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  // Публикует свою высоту в CSS-переменную, пока видим — StickyActionBar (тот же bottom:0)
  // читает её, чтобы приподняться над баннером, а не спрятаться под ним по pointer-events.
  const rootRef = usePublishedHeight(BANNER_HEIGHT_VAR, shown)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(config.storageKey)
      if (!raw) {
        setShown(true)
        return
      }
      const parsed = JSON.parse(raw) as CookieConsentState
      if (parsed.version !== policyVersion) {
        setShown(true)
      }
    } catch {
      setShown(true)
    }

    function handleOpen() {
      const current = window.localStorage.getItem(config.storageKey)
      if (current) {
        try {
          const parsed = JSON.parse(current) as CookieConsentState
          setAnalytics(parsed.analytics)
          setMarketing(parsed.marketing)
        } catch {
          // игнорируем некорректный JSON
        }
      }
      setShown(true)
    }

    window.addEventListener(config.openSettingsEvent, handleOpen)
    return () => window.removeEventListener(config.openSettingsEvent, handleOpen)
  }, [config.storageKey, config.openSettingsEvent, policyVersion])

  function persist(state: CookieConsentState) {
    window.localStorage.setItem(config.storageKey, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent(config.consentChangeEvent, { detail: state }))
    if (consentApiUrl) {
      void fetch(consentApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      }).catch(() => undefined)
    }
    setShown(false)
  }

  function handleSaveCustom() {
    persist({
      necessary: true,
      analytics,
      marketing,
      version: policyVersion,
      acceptedAt: new Date().toISOString(),
    })
  }

  function handleAcceptAll() {
    setAnalytics(true)
    setMarketing(true)
    persist({
      necessary: true,
      analytics: true,
      marketing: true,
      version: policyVersion,
      acceptedAt: new Date().toISOString(),
    })
  }

  if (!shown) {
    return null
  }

  return (
    <Box
      ref={rootRef}
      position="fixed"
      bottom={0}
      left={0}
      right={0}
      bg="bg.panel"
      borderTopWidth="1px"
      borderColor="border"
      zIndex={1000}
      shadow="lg"
    >
      <Container maxW="6xl" py={4}>
        <Stack gap={4}>
          <Text fontSize="sm" color="fg.muted">
            Мы используем cookie. Необходимые — всегда активны.{' '}
            <Box asChild color="brand.solid" _hover={{ textDecoration: 'underline' }} display="inline">
              <Link href={privacyUrl}>Подробнее в политике ПДн</Link>
            </Box>
          </Text>

          <HStack gap={6} wrap="wrap">
            <Checkbox.Root checked disabled colorPalette="brand" size="sm">
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text as="span" fontSize="sm">
                  Необходимые{' '}
                  <Text as="span" fontSize="xs" color="fg.subtle">
                    (сессия)
                  </Text>
                </Text>
              </Checkbox.Label>
            </Checkbox.Root>

            <Checkbox.Root
              checked={analytics}
              onCheckedChange={(e) => setAnalytics(!!e.checked)}
              colorPalette="brand"
              size="sm"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text as="span" fontSize="sm">
                  {analyticsLabel}
                </Text>
              </Checkbox.Label>
            </Checkbox.Root>

            <Checkbox.Root
              checked={marketing}
              onCheckedChange={(e) => setMarketing(!!e.checked)}
              colorPalette="brand"
              size="sm"
            >
              <Checkbox.HiddenInput />
              <Checkbox.Control />
              <Checkbox.Label>
                <Text as="span" fontSize="sm">
                  {marketingLabel}
                </Text>
              </Checkbox.Label>
            </Checkbox.Root>
          </HStack>

          <HStack gap={2} justify="flex-end">
            <Button size="sm" variant="ghost" onClick={handleSaveCustom}>
              Сохранить выбор
            </Button>
            <Button size="sm" colorPalette="brand" onClick={handleAcceptAll}>
              Принять все
            </Button>
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}
