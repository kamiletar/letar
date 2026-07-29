'use client'

import { Link } from '@/i18n/navigation'
import { Box, Button, Link as ChakraLink, Checkbox, Dialog, Portal, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { DISCLAIMER_EN, DISCLAIMER_RU, DISCLAIMER_SUMMARY_EN, DISCLAIMER_SUMMARY_RU } from '../_data/disclaimer'

interface DisclaimerSummaryProps {
  /** Русская локаль (иначе английская) */
  isRu: boolean
}

/**
 * Короткая сводка дисклеймера (этап 5.6.3, UX-фикс 2026-07-29) + ссылка «Подробнее»,
 * открывающая диалог с полным текстом. Раньше полный 4-абзацный текст показывался
 * инлайн перед чекбоксом — пользователь должен был долистать до самого низа, чтобы
 * увидеть чекбокс (замечание Kami: «чекбокс за пределами экрана и непонятно, что
 * делать»). Полный текст никуда не делся — просто не блокирует экран по умолчанию.
 */
export function DisclaimerSummary({ isRu }: DisclaimerSummaryProps) {
  const [open, setOpen] = useState(false)

  return (
    <Box w="100%" maxW="lg" textAlign="left">
      <Text fontSize="sm" color="fg.muted">
        {isRu ? DISCLAIMER_SUMMARY_RU : DISCLAIMER_SUMMARY_EN}{' '}
        <ChakraLink asChild color="blue.500" textDecoration="underline">
          <button type="button" onClick={() => setOpen(true)}>
            {isRu ? 'Подробнее' : 'Learn more'}
          </button>
        </ChakraLink>
      </Text>

      <Dialog.Root open={open} onOpenChange={(e) => setOpen(e.open)} size="md">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>{isRu ? 'Информированное согласие' : 'Informed consent'}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text fontSize="sm" color="fg.muted" whiteSpace="pre-line">
                  {isRu ? DISCLAIMER_RU : DISCLAIMER_EN}
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button onClick={() => setOpen(false)}>{isRu ? 'Закрыть' : 'Close'}</Button>
              </Dialog.Footer>
              <Dialog.CloseTrigger />
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}

interface DisclaimerConsentCheckboxProps {
  /** Согласие проставлено */
  accepted: boolean
  /** Колбэк смены состояния чекбокса */
  onChange: (accepted: boolean) => void
  /** Русская локаль (иначе английская) */
  isRu: boolean
}

/**
 * Чекбокс согласия (этап 5.6.3, UX-фикс 2026-07-29) — живёт внутри липкой панели
 * рядом с CTA (по образцу `CookieBanner`), а не в конце прокручиваемого текста.
 * Чекбокс всегда на экране вместе с кнопкой, которую он разблокирует — связь
 * «отметил → кнопка включилась» видна без скролла. `size="lg"` — увеличенный
 * тач-таргет (WCAG 2.5.5), см. техдолг «низкая заметность чекбокса» в PLAN.md.
 */
export function DisclaimerConsentCheckbox({ accepted, onChange, isRu }: DisclaimerConsentCheckboxProps) {
  return (
    <Checkbox.Root checked={accepted} onCheckedChange={(e) => onChange(!!e.checked)} size="lg" colorPalette="blue">
      <Checkbox.HiddenInput />
      <Checkbox.Control data-testid="disclaimer-consent-checkbox" />
      <Checkbox.Label fontSize="sm" textAlign="left">
        {isRu ? 'Подтверждаю ознакомление и согласие с ' : 'I have read and agree to the '}
        <ChakraLink asChild color="blue.500" textDecoration="underline">
          <Link href="/privacy" target="_blank" rel="noopener noreferrer">
            {isRu ? 'политикой конфиденциальности' : 'privacy policy'}
          </Link>
        </ChakraLink>
      </Checkbox.Label>
    </Checkbox.Root>
  )
}
