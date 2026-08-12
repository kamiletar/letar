import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldMaskedInput', () => {
  describe('рендеринг', () => {
    it('рендерит input с маской', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Код')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('data-field-name', 'code')
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" placeholder="___-___" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByPlaceholderText('___-___')).toBeInTheDocument()
    })
  })

  describe('маскирование ввода', () => {
    it('форматирует значение по маске при посимвольном вводе', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.type(input, '123456')

      expect(input).toHaveValue('123-456')
    })

    it('поддерживает буквенную маску (a)', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="aa-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'AB123')

      expect(input).toHaveValue('AB-123')
    })

    it('отклоняет символы не подходящие под маску', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      // "a" — не цифра, маска '9' её не пропускает; незаполненные позиции показывают placeholder
      await user.type(input, 'a12b34')

      expect(input).toHaveValue('123-4__')
    })

    it('форматирует начальное значение по маске при фокусе', async () => {
      const user = userEvent.setup()
      render(
        <Form initialValue={{ code: '123456' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" label="Код" mask="999-999" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('textbox')
      await user.click(input)

      expect(input).toHaveValue('123-456')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
          <Form.Field.MaskedInput name="code" mask="999-999" helperText="Формат: XXX-XXX" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Формат: XXX-XXX')).toBeInTheDocument()
    })
  })
})
