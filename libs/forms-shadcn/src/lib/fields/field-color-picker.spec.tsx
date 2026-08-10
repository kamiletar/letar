import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldColorPicker } from './field-color-picker'

describe('FieldColorPicker (shadcn)', () => {
  it('рендерит color-инпут, hex-инпут и свотчи по умолчанию', () => {
    render(
      <TestForm defaultValues={{ color: '#ff0000' }}>
        <FieldColorPicker name="color" label="Цвет" />
      </TestForm>,
    )

    expect(screen.getByText('Цвет')).toBeInTheDocument()
    expect(document.querySelector('input[type="color"]')).toHaveValue('#ff0000')
    expect(document.querySelector('input[type="text"]')).toHaveValue('#ff0000')
    expect(screen.getAllByRole('button')).toHaveLength(12)
  })

  it('изменение color-инпута обновляет значение', () => {
    render(
      <TestForm defaultValues={{ color: '#000000' }}>
        <FieldColorPicker name="color" />
      </TestForm>,
    )

    const colorInput = document.querySelector('input[type="color"]') as HTMLInputElement
    fireEvent.change(colorInput, { target: { value: '#00ff00' } })
    expect(document.querySelector('input[type="text"]')).toHaveValue('#00ff00')
  })

  it('клик по свотчу выбирает цвет', () => {
    render(
      <TestForm defaultValues={{ color: '#000000' }}>
        <FieldColorPicker name="color" swatches={['#111111', '#222222']} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: '#222222' }))
    expect(document.querySelector('input[type="color"]')).toHaveValue('#222222')
  })

  it('showInput={false} скрывает hex-инпут', () => {
    render(
      <TestForm defaultValues={{ color: '#000000' }}>
        <FieldColorPicker name="color" showInput={false} />
      </TestForm>,
    )

    expect(document.querySelector('input[type="text"]')).not.toBeInTheDocument()
  })

  // @ts-expect-error — swatches обязан быть string[], негативный контроль типов
  const _typeCheck = <FieldColorPicker name="color" swatches="red" />
})
