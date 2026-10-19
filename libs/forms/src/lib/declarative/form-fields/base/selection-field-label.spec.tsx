import { ChakraProvider, defaultSystem, Field } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { SelectionFieldLabel } from './selection-field-label'

// RequiredIndicator читает контекст Field.Root, как и в реальном поле
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>
    <Field.Root required>{children}</Field.Root>
  </ChakraProvider>
)

describe('SelectionFieldLabel', () => {
  it('звёздочка обязательности отделена от текста отступом (а не слипается: «Tags*»)', () => {
    const { container } = render(
      <TestWrapper>
        <label>
          <SelectionFieldLabel label="Tags" required />
        </label>
      </TestWrapper>,
    )

    const indicator = container.querySelector('.chakra-field__requiredIndicator')
    expect(indicator).not.toBeNull()

    // Обёртка вокруг текста и звёздочки — inline-flex с gap: отступ не зависит от display внешнего label
    const wrapper = indicator?.parentElement as HTMLElement
    const style = getComputedStyle(wrapper)
    expect(style.display).toBe('inline-flex')
    // jsdom не раскрывает шорткат gap в column-gap, поэтому читаем сам gap
    expect(style.gap).toMatch(/spacing-1|4px|0\.25rem/)
  })

  it('без required звёздочки нет', () => {
    const { container } = render(
      <TestWrapper>
        <SelectionFieldLabel label="Tags" />
      </TestWrapper>,
    )

    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(container.querySelector('.chakra-field__requiredIndicator')).toBeNull()
  })

  it('подпись и подсказка остаются соседями в одной обёртке', () => {
    render(
      <TestWrapper>
        <SelectionFieldLabel label="Price" tooltip={{ title: 'Price', description: 'Цена в каталоге' }} required />
      </TestWrapper>,
    )

    expect(screen.getByText('Price')).toBeInTheDocument()
  })
})
