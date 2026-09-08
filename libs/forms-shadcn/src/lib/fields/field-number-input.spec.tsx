import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldNumberInput } from './field-number-input'

describe('FieldNumberInput (shadcn)', () => {
  it('рендерит с меткой и начальным значением', () => {
    render(
      <TestForm defaultValues={{ qty: 5 }}>
        <FieldNumberInput name="qty" label="Количество" />
      </TestForm>,
    )

    expect(screen.getByText('Количество')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toHaveValue('5')
  })

  it('увеличивает значение по клику "Увеличить"', () => {
    render(
      <TestForm defaultValues={{ qty: 5 }}>
        <FieldNumberInput name="qty" label="Количество" step={2} />
      </TestForm>,
    )

    fireEvent.click(screen.getByLabelText('Увеличить'))
    expect(screen.getByRole('spinbutton')).toHaveValue('7')
  })

  it('уменьшает значение по клику "Уменьшить"', () => {
    render(
      <TestForm defaultValues={{ qty: 5 }}>
        <FieldNumberInput name="qty" label="Количество" />
      </TestForm>,
    )

    fireEvent.click(screen.getByLabelText('Уменьшить'))
    expect(screen.getByRole('spinbutton')).toHaveValue('4')
  })

  it('клампит по max при инкременте', () => {
    render(
      <TestForm defaultValues={{ qty: 10 }}>
        <FieldNumberInput name="qty" label="Количество" max={10} />
      </TestForm>,
    )

    expect(screen.getByLabelText('Увеличить')).toBeDisabled()
  })

  it('клампит по min при декременте', () => {
    render(
      <TestForm defaultValues={{ qty: 0 }}>
        <FieldNumberInput name="qty" label="Количество" min={0} />
      </TestForm>,
    )

    expect(screen.getByLabelText('Уменьшить')).toBeDisabled()
  })

  it('прямой ввод в инпут обновляет значение', () => {
    render(
      <TestForm defaultValues={{ qty: 5 }}>
        <FieldNumberInput name="qty" label="Количество" />
      </TestForm>,
    )

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '42' } })
    expect(screen.getByRole('spinbutton')).toHaveValue('42')
  })

  it('disabled блокирует степпер-кнопки', () => {
    render(
      <TestForm defaultValues={{ qty: 5 }}>
        <FieldNumberInput name="qty" label="Количество" disabled />
      </TestForm>,
    )

    expect(screen.getByLabelText('Увеличить')).toBeDisabled()
    expect(screen.getByLabelText('Уменьшить')).toBeDisabled()
  })

  describe('локаль (десятичный разделитель)', () => {
    it('без FormI18nProvider парсит точку (en-US по умолчанию)', () => {
      render(
        <TestForm defaultValues={{ price: undefined }}>
          <FieldNumberInput name="price" />
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
            <FieldNumberInput name="price" />
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
            <FieldNumberInput name="price" />
          </TestForm>
        </FormI18nProvider>,
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '234.65' } })
      expect(input).toHaveAttribute('aria-valuenow', '234.65')
    })
  })
})
