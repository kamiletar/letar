import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { label: 'Красный', value: 'red' },
  { label: 'Зелёный', value: 'green' },
  { label: 'Синий', value: 'blue' },
]

describe('FieldListbox', () => {
  describe('rendering', () => {
    it('рендерит listbox', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '' }} onSubmit={vi.fn()}>
            <Form.Field.Listbox name="color" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '' }} onSubmit={vi.fn()}>
            <Form.Field.Listbox name="color" label="Цвет" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Цвет')).toBeInTheDocument()
    })

    it('рендерит все опции', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '' }} onSubmit={vi.fn()}>
            <Form.Field.Listbox name="color" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Красный')).toBeInTheDocument()
      expect(screen.getByText('Зелёный')).toBeInTheDocument()
      expect(screen.getByText('Синий')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '' }} onSubmit={vi.fn()}>
            <Form.Field.Listbox name="color" options={options} disabled />
          </Form>
        </TestWrapper>,
      )

      // Listbox в disabled режиме — проверяем что компонент рендерится
      const listbox = screen.getByRole('listbox')
      expect(listbox).toBeInTheDocument()
    })
  })

  describe('selection', () => {
    it('показывает выбранное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: 'green' }} onSubmit={vi.fn()}>
            <Form.Field.Listbox name="color" options={options} />
          </Form>
        </TestWrapper>,
      )

      // Выбранный элемент должен быть отмечен
      const greenOption = screen.getByText('Зелёный').closest('[role="option"]')
      expect(greenOption).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('description', () => {
    it('вторая строка пункта — сосед текста; выбор и подпись пункта от неё не зависят', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: 'msk' }} onSubmit={vi.fn()}>
            <Form.Field.Listbox
              name="city"
              options={[
                { label: 'Москва', value: 'msk', description: 'ул. Тверская, 1' },
                { label: 'Казань', value: 'kzn' },
              ]}
            />
          </Form>
        </TestWrapper>,
      )

      const descriptions = document.querySelectorAll('[data-part="item-description"]')
      expect(descriptions).toHaveLength(1)
      expect(descriptions[0]).toHaveTextContent('ул. Тверская, 1')
      const moscow = screen.getByText('Москва').closest('[role="option"]')
      expect(moscow).toHaveAttribute('aria-selected', 'true')
      // Описание не входит в текст пункта — подпись для типизации и поиска остаётся «Москва»
      expect(screen.getByText('Москва')).not.toContainElement(descriptions[0] as HTMLElement)
    })
  })
})
