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
  /**
   * `zIndex` баннера — по умолчанию 1000, выше практически любого оверлея приложения. Публичной
   * части studio (REDESIGN_PLAN.md §1/§7) нужно значение ниже слоёв трубки (300–303): иначе баннер
   * рендерится поверх развёртки/гало и выпадает из «изображения на экране» целиком.
   */
  zIndex?: number | string
}

export function CookieBanner({
  appKey,
  privacyUrl = '/privacy',
  policyVersion = 'v1',
  consentApiUrl = '/api/consent',
  analyticsLabel = 'Аналитика (Я.Метрика)',
  marketingLabel = 'Маркетинг (ретаргетинг)',
  zIndex = 1000,
}: CookieBannerProps) {
  const config = createConsentConfig(appKey, policyVersion)
  // ⚠️ По умолчанию `true`, не `false` — рендерится сразу на сервере вместе с остальным
  // контентом страницы. Раньше стартовал с `false` и переключался в `true` только внутри
  // useEffect: на content-light страницах (формы входа/регистрации) баннер оставался
  // единственным крупным элементом, появлявшимся ПОСЛЕ гидратации — Lighthouse брал его
  // текст как LCP-элемент, раздувая LCP до времени полной гидратации (7.2–8.4с вместо
  // времени первой отрисовки). Эффект ниже по-прежнему прячет баннер (`setShown(false)`),
  // если найдено валидное согласие под текущей версией политики — для вернувшихся
  // пользователей возможна короткая вспышка баннера на время гидратации, это дешевле
  // регрессии LCP. Баннер `position: fixed`, поэтому скрытие не даёт CLS.
  const [shown, setShown] = useState(true)
  // Гранулярные чекбоксы скрыты, пока пользователь явно не нажмёт «Настроить» — по умолчанию
  // баннер занимает одну строку текста + строку кнопок, а не три ряда с чекбоксами.
  const [expanded, setExpanded] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  // Публикует свою высоту в CSS-переменную, пока видим — StickyActionBar (тот же bottom:0)
  // читает её, чтобы приподняться над баннером, а не спрятаться под ним по pointer-events.
  const rootRef = usePublishedHeight(BANNER_HEIGHT_VAR, shown)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(config.storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as CookieConsentState
        if (parsed.version === policyVersion) {
          setShown(false)
        }
      }
    } catch {
      // некорректный JSON в localStorage — считаем, что согласия нет, баннер остаётся видимым
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
      setExpanded(true)
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
      zIndex={zIndex}
      shadow="lg"
    >
      <Container maxW="6xl" py={2}>
        <Stack gap={2}>
          <Text fontSize="xs" color="fg.muted">
            Мы используем cookie. Необходимые — всегда активны.{' '}
            <Box asChild color="brand.solid" _hover={{ textDecoration: 'underline' }} display="inline">
              <Link href={privacyUrl}>Подробнее в политике ПДн</Link>
            </Box>
          </Text>

          {expanded && (
            <HStack gap={3} wrap="wrap">
              <Checkbox.Root checked disabled colorPalette="brand" size="sm">
                <Checkbox.HiddenInput />
                <Checkbox.Control />
                <Checkbox.Label>
                  <Text as="span" fontSize="xs">
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
                  <Text as="span" fontSize="xs">
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
                  <Text as="span" fontSize="xs">
                    {marketingLabel}
                  </Text>
                </Checkbox.Label>
              </Checkbox.Root>
            </HStack>
          )}

          <HStack gap={2} justify="flex-end">
            {expanded
              ? (
                <Button size="sm" variant="ghost" onClick={handleSaveCustom}>
                  Сохранить выбор
                </Button>
              )
              : (
                <Button size="sm" variant="ghost" onClick={() => setExpanded(true)}>
                  Настроить
                </Button>
              )}
            <Button size="sm" colorPalette="brand" onClick={handleAcceptAll}>
              Принять все
            </Button>
          </HStack>
        </Stack>
      </Container>
    </Box>
  )
}
