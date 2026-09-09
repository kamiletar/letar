import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

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

    it('с FormI18nProvider locale="ru" точка тоже парсится как десятичный разделитель', async () => {
      // В ru-локали точка не входит в набор служебных символов формата (там нет "." вообще),
      // поэтому @internationalized/number пропускает её как есть — оба разделителя равнозначны.
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
      await user.paste('234.65')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ price: 234.65 }))
    })
  })

  describe('minorUnitScale (копейки↔рубли)', () => {
    it('без minorUnitScale ведёт себя как раньше (scale=1)', () => {
      render(
        <Form initialValue={{ price: 123.45 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="price" />
        </Form>,
        { wrapper: TestWrapper },
      )

      // U+00A0 (неразрывный пробел) между кодом валюты и суммой — вывод Intl.NumberFormat/@internationalized/number
      expect(screen.getByRole('spinbutton')).toHaveValue('RUB 123.45')
    })

    it('отображает значение в major units (рубли), храня minor units (копейки)', () => {
      render(
        <Form initialValue={{ priceKopecks: 12345 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="priceKopecks" minorUnitScale={100} />
        </Form>,
        { wrapper: TestWrapper },
      )

      // U+00A0 (неразрывный пробел) между кодом валюты и суммой — вывод Intl.NumberFormat/@internationalized/number
      expect(screen.getByRole('spinbutton')).toHaveValue('RUB 123.45')
    })

    it('при вводе рублей сохраняет в форме целое число копеек', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(
        <Form initialValue={{ priceKopecks: undefined }} onSubmit={onSubmit}>
          <Form.Field.Currency name="priceKopecks" minorUnitScale={100} />
          <Form.Button.Submit>Submit</Form.Button.Submit>
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton')
      await user.click(input)
      await user.paste('123.45')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ priceKopecks: 12345 }))
    })

    it('пустое значение остаётся пустым независимо от scale', () => {
      render(
        <Form initialValue={{ priceKopecks: undefined }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="priceKopecks" minorUnitScale={100} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('')
    })
  })

  describe('minorUnitScale из schema.zmodel (@meta("form.props.minorUnitScale", value))', () => {
    it('резолвится из meta.fieldProps без JSX-пропа', () => {
      const Schema = z.object({
        priceKopecks: z.number().meta({ ui: { fieldProps: { minorUnitScale: 100 } } }),
      })

      render(
        <Form schema={Schema} initialValue={{ priceKopecks: 12345 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="priceKopecks" />
        </Form>,
        { wrapper: TestWrapper },
      )

      // Без явного JSX-пропа minorUnitScale={100} значение всё равно резолвится из схемы —
      // 12345 копеек показываются как 123.45 рублей.
      // U+00A0 (неразрывный пробел) между кодом валюты и суммой — вывод Intl.NumberFormat/@internationalized/number
      expect(screen.getByRole('spinbutton')).toHaveValue('RUB 123.45')
    })

    it('явный JSX-проп побеждает значение из meta.fieldProps (props > meta)', () => {
      const Schema = z.object({
        // Схема намеренно указывает "неверный" scale — проп должен его перебить
        priceKopecks: z.number().meta({ ui: { fieldProps: { minorUnitScale: 1 } } }),
      })

      render(
        <Form schema={Schema} initialValue={{ priceKopecks: 12345 }} onSubmit={vi.fn()}>
          <Form.Field.Currency name="priceKopecks" minorUnitScale={100} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('RUB 123.45')
    })
  })
})
