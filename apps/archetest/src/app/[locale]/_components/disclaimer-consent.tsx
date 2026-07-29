'use client'

import { Link } from '@/i18n/navigation'
import { Box, Link as ChakraLink, Checkbox, Text } from '@chakra-ui/react'
import { DISCLAIMER_EN, DISCLAIMER_RU } from '../_data/disclaimer'

interface DisclaimerConsentProps {
  /** Согласие проставлено */
  accepted: boolean
  /** Колбэк смены состояния чекбокса */
  onChange: (accepted: boolean) => void
  /** Русская локаль (иначе английская) */
  isRu: boolean
}

/**
 * Экран информированного согласия (этап 5.6.3): полный дисклеймер + чекбокс со
 * ссылкой на политику конфиденциальности. Общий для полного квиза и экспресса.
 * Чекбокс НЕ предотмечен (152-ФЗ), стартовую кнопку гейтит вызывающий.
 */
export function DisclaimerConsent({ accepted, onChange, isRu }: DisclaimerConsentProps) {
  return (
    <Box
      w="100%"
      maxW="lg"
      p={5}
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border"
      bg="bg.subtle"
      textAlign="left"
      // scroll-margin-bottom (не только padding-bottom на родителе!) — браузерный
      // scrollIntoView() (и Playwright actionability, который его использует) скроллит
      // МИНИМАЛЬНО необходимое расстояние, а не до самого низа страницы. padding-bottom
      // на родительском контейнере защищает только «докрутили до конца», а не
      // промежуточные позиции — scroll-margin-bottom учитывается ЛЮБЫМ scrollIntoView,
      // гарантируя зазор от sticky-панели независимо от того, докрутили страницу
      // полностью или ровно настолько, чтобы этот блок стал виден (archetest, 2026-07-29:
      // Playwright реально застревал именно в этой промежуточной позиции — `checkbox__
      // control intercepts pointer events`, т.к. попадал в перекрытую StickyActionBar+
      // CookieBanner зону, docs — `.claude/docs/ui-components.md`).
      scrollMarginBottom="calc(var(--letar-sticky-actionbar-height, 0px) + var(--letar-cookie-banner-height, 0px) + 1rem)"
    >
      <Text fontSize="xs" color="fg.muted" whiteSpace="pre-line" mb={4}>
        {isRu ? DISCLAIMER_RU : DISCLAIMER_EN}
      </Text>
      <Checkbox.Root checked={accepted} onCheckedChange={(e) => onChange(!!e.checked)}>
        <Checkbox.HiddenInput />
        <Checkbox.Control />
        <Checkbox.Label fontSize="sm">
          {isRu ? 'Подтверждаю ознакомление и согласие с ' : 'I have read and agree to the '}
          <ChakraLink asChild color="blue.500" textDecoration="underline">
            <Link href="/privacy" target="_blank" rel="noopener noreferrer">
              {isRu ? 'политикой конфиденциальности' : 'privacy policy'}
            </Link>
          </ChakraLink>
        </Checkbox.Label>
      </Checkbox.Root>
    </Box>
  )
}
