import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCurrency } from './field-currency'

describe('FieldCurrency (shadcn)', () => {
  it('рендерит NumberInput и символ рубля по умолчанию', () => {
    render(
      <TestForm defaultValues={{ price: 100 }}>
        <FieldCurrency name="price" label="Цена" />
      </TestForm>,
    )

    expect(screen.getByText('Цена')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue('100')
    expect(screen.getByText('₽')).toBeInTheDocument()
  })

  it('currency="USD" показывает символ доллара', () => {
    render(
      <TestForm defaultValues={{ price: 0 }}>
        <FieldCurrency name="price" currency="USD" />
      </TestForm>,
    )

    expect(screen.getByText('$')).toBeInTheDocument()
  })

  it('изменение значения обновляет число', () => {
    render(
      <TestForm defaultValues={{ price: 0 }}>
        <FieldCurrency name="price" />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '250.50' } })

    expect(input).toHaveValue('250.50')
  })

  // @ts-expect-error — min обязан быть number, негативный контроль типов
  const _typeCheck = <FieldCurrency name="price" min="0" />

  describe('локаль (десятичный разделитель)', () => {
    it('без FormI18nProvider парсит точку (en-US по умолчанию)', () => {
      render(
        <TestForm defaultValues={{ price: undefined }}>
          <FieldCurrency name="price" />
        </TestForm>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '234.65' } })
      expect(input).toHaveAttribute('aria-valuenow', '234.65')
    })

    it('с FormI18nProvider locale="ru" парсит запятую как десятичный разделитель', () => {
      render(
        <FormI18nProvider locale="ru">
          <TestForm defaultValues={{ price: undefined }}>
            <FieldCurrency name="price" />
          </TestForm>
        </FormI18nProvider>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '234,65' } })
      expect(input).toHaveAttribute('aria-valuenow', '234.65')
    })

    it('с FormI18nProvider locale="ru" точка тоже парсится как десятичный разделитель', () => {
      render(
        <FormI18nProvider locale="ru">
          <TestForm defaultValues={{ price: undefined }}>
            <FieldCurrency name="price" />
          </TestForm>
        </FormI18nProvider>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '234.65' } })
      expect(input).toHaveAttribute('aria-valuenow', '234.65')
    })
  })

  describe('minorUnitScale (копейки↔рубли)', () => {
    it('без minorUnitScale ведёт себя как раньше (scale=1)', () => {
      render(
        <TestForm defaultValues={{ price: 123.45 }}>
          <FieldCurrency name="price" />
        </TestForm>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('123.45')
    })

    it('отображает значение в major units (рубли), храня minor units (копейки)', () => {
      render(
        <TestForm defaultValues={{ priceKopecks: 12345 }}>
          <FieldCurrency name="priceKopecks" minorUnitScale={100} />
        </TestForm>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('123.45')
    })

    it('при вводе рублей сохраняет в форме целое число копеек', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. TestForm.onFormReady
      let form: any
      render(
        <TestForm defaultValues={{ priceKopecks: undefined }} onFormReady={(f) => (form = f)}>
          <FieldCurrency name="priceKopecks" minorUnitScale={100} />
        </TestForm>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '123.45' } })

      expect(form.state.values.priceKopecks).toBe(12345)
    })

    it('пустое значение остаётся пустым независимо от scale', () => {
      render(
        <TestForm defaultValues={{ priceKopecks: undefined }}>
          <FieldCurrency name="priceKopecks" minorUnitScale={100} />
        </TestForm>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('')
    })
  })
})
