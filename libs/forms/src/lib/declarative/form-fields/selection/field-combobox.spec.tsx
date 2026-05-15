import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
]

describe('FieldCombobox', () => {
  describe('рендеринг', () => {
    it('рендерит combobox', () => {
      render(
        <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="framework" label="Фреймворк" options={options} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Фреймворк')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      const { container } = render(
        <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="framework" options={options} />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = container.querySelector('[data-field-name="framework"]')
      expect(input).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="framework" options={options} placeholder="Выберите фреймворк" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByPlaceholderText('Выберите фреймворк')).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="framework" options={options} disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('combobox')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
          <Form.Field.Combobox name="framework" options={options} helperText="Начните вводить" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Начните вводить')).toBeInTheDocument()
    })
  })
})
