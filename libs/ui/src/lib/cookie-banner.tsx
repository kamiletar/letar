'use client'

import { Box, Button, Checkbox, Container, HStack, Stack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { type CookieConsentState, createConsentConfig } from './consent-types'

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
  const rootRef = useRef<HTMLDivElement>(null)

  // Публикует свою высоту в CSS-переменную, пока видим — StickyActionBar (тот же bottom:0)
  // читает её, чтобы приподняться над баннером, а не спрятаться под ним по pointer-events.
  // Синхронный getBoundingClientRect() в useLayoutEffect даёт значение до первой отрисовки,
  // но само по себе недостаточно: на реальной странице замер иногда попадает на момент ДО
  // того, как осядут стили/шрифты/соседние баннеры (offline-consent и т.п.) — измеренная
  // высота оказывается неверной и раньше замораживалась навсегда, потому что единственным
  // триггером пересчёта был `window resize`, а на статичном вьюпорте (планшет на феста, без
  // изменения размера окна) он никогда не происходит. Подтверждено вручную: после чистой
  // загрузки `--letar-cookie-banner-height` показывал 1655px (в 12 раз больше реальных
  // 142px) и не исправлялся сам — только после ручного resize.
  // ResizeObserver — правильный инструмент для «пересчитывать при любом изменении размера
  // элемента», не только для явного resize окна; используем его как основной механизм,
  // getBoundingClientRect — только для немедленного значения при первом монтировании (быстрее
  // первого колбэка ResizeObserver, который приходит асинхронно).
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!shown || !rootRef.current) {
      root.style.setProperty(BANNER_HEIGHT_VAR, '0px')
      return
    }
    const el = rootRef.current
    root.style.setProperty(BANNER_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`)

    // getBoundingClientRect() и в колбэке (не entry.contentRect) — тот считает только
    // content-box (без border), а у баннера есть borderTopWidth, из-за чего высоты
    // разошлись бы на 1px между первым и последующими замерами.
    const observer = new ResizeObserver(() => {
      root.style.setProperty(BANNER_HEIGHT_VAR, `${el.getBoundingClientRect().height}px`)
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      root.style.setProperty(BANNER_HEIGHT_VAR, '0px')
    }
  }, [shown])

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
