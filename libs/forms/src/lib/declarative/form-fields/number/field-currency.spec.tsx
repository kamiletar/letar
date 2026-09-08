import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldCurrency', () => {
  describe('рендеринг', () => {
    it('рендерит числовое поле', () => {
      render(
        <Form initialValue={{ price: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="price" label="Цена" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Цена')).toBeInTheDocument()
      // NumberInput рендерит spinbutton
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      const { container } = render(
        <Form initialValue={{ price: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="price" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = container.querySelector('[data-field-name="price"]')
      expect(input).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ price: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="price" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ price: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="price" helperText="Укажите стоимость" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Укажите стоимость')).toBeInTheDocument()
    })
  })

  describe('локаль (десятичный разделитель)', () => {
    it('с FormI18nProvider locale="ru" парсит запятую как десятичный разделитель', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <FormI18nProvider locale="ru">
          <Form initialValue={{ price: undefined }} onSubmit={onSubmit}>
            <Form.Field.Currency name="price" />
            <Form.Button.Submit>Submit</Form.Button.Submit>
          </Form>
        </FormI18nProvider>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton')
      await user.click(input)
      await user.paste('234,65')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ price: 234.65 }))
    })
  })
})
