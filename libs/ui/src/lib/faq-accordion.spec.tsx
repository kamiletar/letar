import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { FaqAccordion } from './faq-accordion'

function renderWithProvider(ui: ReactNode) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>)
}

const items = [
  { question: 'Первый вопрос', answer: 'Первый ответ' },
  { question: 'Второй вопрос', answer: 'Второй ответ' },
]

/**
 * Триггер — это `<button>`, чей `aria-expanded`/`data-state` отражает состояние немедленно
 * (`getItemTriggerProps` в zag-js). Содержимое (`Accordion.ItemContent`) остаётся смонтированным
 * в DOM ещё некоторое время после сворачивания — оно ждёт animationend/transitionend, которые
 * jsdom не эмулирует, поэтому проверять открытость по DOM-присутствию ответа ненадёжно.
 */
function getTrigger(question: string) {
  return screen.getByText(question).closest('button') as HTMLButtonElement
}

describe('FaqAccordion', () => {
  it('рендерит все вопросы', () => {
    renderWithProvider(<FaqAccordion items={items} />)

    expect(screen.getByText('Первый вопрос')).toBeInTheDocument()
    expect(screen.getByText('Второй вопрос')).toBeInTheDocument()
  })

  it('по умолчанию все пункты закрыты', () => {
    renderWithProvider(<FaqAccordion items={items} />)

    expect(getTrigger('Первый вопрос')).toHaveAttribute('aria-expanded', 'false')
    expect(getTrigger('Второй вопрос')).toHaveAttribute('aria-expanded', 'false')
  })

  it('раскрывает первый вопрос сразу при defaultOpenFirst', () => {
    renderWithProvider(<FaqAccordion items={items} defaultOpenFirst />)

    expect(getTrigger('Первый вопрос')).toHaveAttribute('aria-expanded', 'true')
    expect(getTrigger('Второй вопрос')).toHaveAttribute('aria-expanded', 'false')
  })

  it('открывает пункт по клику на триггер', async () => {
    const user = userEvent.setup()
    renderWithProvider(<FaqAccordion items={items} />)

    const trigger = getTrigger('Первый вопрос')
    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('data-state', 'open')
  })

  it('закрывает открытый пункт повторным кликом (collapsible)', async () => {
    const user = userEvent.setup()
    renderWithProvider(<FaqAccordion items={items} />)

    const trigger = getTrigger('Первый вопрос')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })

  it('рендерит иконку перед вопросом, когда она задана', () => {
    renderWithProvider(<FaqAccordion items={items} icon={<span data-testid="faq-icon">*</span>} />)

    expect(screen.getAllByTestId('faq-icon')).toHaveLength(items.length)
  })
})
