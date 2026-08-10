import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPinInput } from './field-pin-input'

describe('FieldPinInput (shadcn)', () => {
  it('рендерит нужное число ячеек', () => {
    render(
      <TestForm defaultValues={{ pin: '' }}>
        <FieldPinInput name="pin" label="Код" length={4} />
      </TestForm>,
    )

    expect(screen.getByText('Код')).toBeInTheDocument()
    expect(document.querySelectorAll('input[maxlength="1"]')).toHaveLength(4)
  })

  it('ввод символа переводит фокус на следующую ячейку', () => {
    render(
      <TestForm defaultValues={{ pin: '' }}>
        <FieldPinInput name="pin" label="Код" length={4} />
      </TestForm>,
    )

    const boxes = screen.getAllByRole('textbox') as HTMLInputElement[]
    fireEvent.change(boxes[0], { target: { value: '1' } })
    expect(document.activeElement).toBe(boxes[1])
  })

  it('вызывает onComplete когда заполнены все ячейки', () => {
    let completed = ''
    render(
      <TestForm defaultValues={{ pin: '123' }}>
        <FieldPinInput name="pin" label="Код" length={4} onComplete={(v) => (completed = v)} />
      </TestForm>,
    )

    const boxes = screen.getAllByRole('textbox') as HTMLInputElement[]
    fireEvent.change(boxes[3], { target: { value: '4' } })
    expect(completed).toBe('1234')
  })
})
