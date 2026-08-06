import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { value: 'ru', label: 'Россия' },
  { value: 'us', label: 'США' },
  { value: 'de', label: 'Германия' },
]

describe('FieldNativeSelect', () => {
  describe('рендеринг', () => {
    it('рендерит нативный select', () => {
      render(
        <Form initialValue={{ country: 'ru' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" label="Страна" options={options} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Страна')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('рендерит все опции', () => {
      const { container } = render(
        <Form initialValue={{ country: 'ru' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" options={options} />
        </Form>,
        { wrapper: TestWrapper },
      )

      const optionElements = container.querySelectorAll('option')
      const optionValues = [...optionElements].map((o) => o.getAttribute('value') || o.textContent)
      expect(optionValues).toContain('ru')
      expect(optionValues).toContain('us')
      expect(optionValues).toContain('de')
    })

    it('выбирает начальное значение', () => {
      render(
        <Form initialValue={{ country: 'us' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" options={options} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('combobox')).toHaveValue('us')
    })
  })

  describe('взаимодействие', () => {
    it('меняет значение при выборе опции', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ country: 'ru' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" options={options} />
        </Form>,
        { wrapper: TestWrapper },
      )

      const select = screen.getByRole('combobox')
      await user.selectOptions(select, 'de')
      expect(select).toHaveValue('de')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ country: 'ru' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" options={options} disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('combobox')).toBeDisabled()
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ country: '' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" options={options} placeholder="Выберите страну" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Выберите страну')).toBeInTheDocument()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ country: 'ru' }} onSubmit={vi.fn()}>
          <Form.Field.NativeSelect name="country" options={options} helperText="Страна проживания" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Страна проживания')).toBeInTheDocument()
    })
  })
})
