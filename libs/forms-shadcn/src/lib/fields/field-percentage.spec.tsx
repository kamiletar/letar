import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPercentage } from './field-percentage'

describe('FieldPercentage (shadcn)', () => {
  it('рендерит NumberInput и знак процента', () => {
    render(
      <TestForm defaultValues={{ discount: 15 }}>
        <FieldPercentage name="discount" label="Скидка" />
      </TestForm>,
    )

    expect(screen.getByText('Скидка')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue('15')
    expect(screen.getByText('%')).toBeInTheDocument()
  })

  it('дефолтные min/max — 0 и 100', () => {
    render(
      <TestForm defaultValues={{ discount: 0 }}>
        <FieldPercentage name="discount" />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '0')
    expect(input).toHaveAttribute('max', '100')
  })

  it('изменение значения обновляет число', () => {
    render(
      <TestForm defaultValues={{ discount: 0 }}>
        <FieldPercentage name="discount" />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '42' } })

    expect(input).toHaveValue('42')
  })

  // @ts-expect-error — max обязан быть number, негативный контроль типов
  const _typeCheck = <FieldPercentage name="discount" max="100" />

  describe('локаль (десятичный разделитель)', () => {
    it('без FormI18nProvider парсит точку (en-US по умолчанию)', () => {
      render(
        <TestForm defaultValues={{ discount: undefined }}>
          <FieldPercentage name="discount" min={0} max={100} />
        </TestForm>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '42.5' } })
      expect(input).toHaveAttribute('aria-valuenow', '42.5')
    })

    it('с FormI18nProvider locale="ru" парсит запятую как десятичный разделитель', () => {
      render(
        <FormI18nProvider locale="ru">
          <TestForm defaultValues={{ discount: undefined }}>
            <FieldPercentage name="discount" min={0} max={100} />
          </TestForm>
        </FormI18nProvider>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '42,5' } })
      expect(input).toHaveAttribute('aria-valuenow', '42.5')
    })

    it('с FormI18nProvider locale="ru" точка тоже парсится как десятичный разделитель', () => {
      render(
        <FormI18nProvider locale="ru">
          <TestForm defaultValues={{ discount: undefined }}>
            <FieldPercentage name="discount" min={0} max={100} />
          </TestForm>
        </FormI18nProvider>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '42.5' } })
      expect(input).toHaveAttribute('aria-valuenow', '42.5')
    })
  })

  describe('minorUnitScale (базисные пункты↔%)', () => {
    it('без minorUnitScale ведёт себя как раньше (scale=1)', () => {
      render(
        <TestForm defaultValues={{ discount: 13 }}>
          <FieldPercentage name="discount" />
        </TestForm>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('13')
    })

    it('отображает значение в major units (%), храня minor units (б.п.)', () => {
      render(
        <TestForm defaultValues={{ annualRateBps: 1350 }}>
          <FieldPercentage name="annualRateBps" minorUnitScale={100} />
        </TestForm>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('13.5')
    })

    it('при вводе процентов сохраняет в форме целое число базисных пунктов', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- см. TestForm.onFormReady
      let form: any
      render(
        <TestForm defaultValues={{ annualRateBps: undefined }} onFormReady={(f) => (form = f)}>
          <FieldPercentage name="annualRateBps" minorUnitScale={100} />
        </TestForm>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '13.5' } })

      expect(form.state.values.annualRateBps).toBe(1350)
    })

    it('пустое значение остаётся пустым независимо от scale', () => {
      render(
        <TestForm defaultValues={{ annualRateBps: undefined }}>
          <FieldPercentage name="annualRateBps" minorUnitScale={100} />
        </TestForm>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('')
    })
  })
})
