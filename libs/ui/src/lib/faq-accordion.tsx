'use client'

import type { Accordion as ChakraAccordion } from '@chakra-ui/react'
import { Accordion, Box, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface FaqItem {
  question: string
  answer: string
}

export interface FaqAccordionProps extends Omit<ChakraAccordion.RootProps, 'children' | 'collapsible'> {
  /** Список вопросов-ответов */
  items: FaqItem[]
  /** Иконка перед вопросом — одна и та же для всех пунктов */
  icon?: ReactNode
  /** Раскрыть первый вопрос сразу */
  defaultOpenFirst?: boolean
  /** Доп. пропсы на каждый `Accordion.Item` — для бордеров/фона/`_open` состояния */
  itemProps?: Omit<ChakraAccordion.ItemProps, 'value' | 'children'>
}

/**
 * Список вопрос-ответ на базе Chakra `Accordion` (§M4.3 aboi) — до этого одна и та же
 * разметка (`Accordion.Item`/`ItemTrigger`/`ItemIndicator`/`ItemContent`) была независимо
 * написана в aboi, driving-school и animatrona-landing.
 *
 * Вокруг компонента (заголовок секции, motion-обёртка, Dialog) остаётся на стороне
 * приложения — это чересчур разное между случаями, чтобы обобщать.
 */
export function FaqAccordion({ items, icon, defaultOpenFirst, itemProps, ...rootProps }: FaqAccordionProps) {
  return (
    <Accordion.Root
      collapsible
      defaultValue={defaultOpenFirst && items[0] ? [items[0].question] : undefined}
      {...rootProps}
    >
      {items.map((item) => (
        <Accordion.Item key={item.question} value={item.question} {...itemProps}>
          <Accordion.ItemTrigger>
            {icon && <Box flexShrink={0}>{icon}</Box>}
            <Text flex="1" fontWeight="medium" textAlign="left">
              {item.question}
            </Text>
            <Accordion.ItemIndicator />
          </Accordion.ItemTrigger>
          <Accordion.ItemContent>
            <Accordion.ItemBody>
              <Text color="fg.muted" lineHeight="tall">
                {item.answer}
              </Text>
            </Accordion.ItemBody>
          </Accordion.ItemContent>
        </Accordion.Item>
      ))}
    </Accordion.Root>
  )
}
