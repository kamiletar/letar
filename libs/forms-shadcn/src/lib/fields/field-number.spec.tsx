import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldNumber } from './field-number'

describe('FieldNumber (shadcn)', () => {
  it('рендерит с начальным значением', () => {
    render(
      <TestForm defaultValues={{ portions: 4 }}>
        <FieldNumber name="portions" label="Порции" />
      </TestForm>,
    )

    expect(screen.getByText('Порции')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue('4')
  })

  it('пустое значение отдаёт null, не NaN', () => {
    render(
      <TestForm defaultValues={{ portions: 4 }}>
        <FieldNumber name="portions" label="Порции" />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '' } })
    expect(input).toHaveValue('')
  })

  it('передаёт min/max/step в input', () => {
    render(
      <TestForm defaultValues={{ portions: 4 }}>
        <FieldNumber name="portions" label="Порции" min={1} max={10} step={1} />
      </TestForm>,
    )

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('min', '1')
    expect(input).toHaveAttribute('max', '10')
    expect(input).toHaveAttribute('step', '1')
  })

  describe('локаль (десятичный разделитель)', () => {
    it('без FormI18nProvider парсит точку (en-US по умолчанию)', () => {
      render(
        <TestForm defaultValues={{ price: null }}>
          <FieldNumber name="price" />
        </TestForm>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '234.65' } })
      expect(input).toHaveAttribute('aria-valuenow', '234.65')
    })

    it('с FormI18nProvider locale="ru" парсит запятую как десятичный разделитель', () => {
      render(
        <FormI18nProvider locale="ru">
          <TestForm defaultValues={{ price: null }}>
            <FieldNumber name="price" />
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
          <TestForm defaultValues={{ price: null }}>
            <FieldNumber name="price" />
          </TestForm>
        </FormI18nProvider>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '234.65' } })
      expect(input).toHaveAttribute('aria-valuenow', '234.65')
    })
  })
})
