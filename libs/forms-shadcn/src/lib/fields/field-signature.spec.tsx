import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldSignature } from './field-signature'

describe('FieldSignature (shadcn)', () => {
  it('показывает placeholder на пустом canvas в draw mode', () => {
    render(
      <TestForm defaultValues={{ signature: '' }}>
        <FieldSignature name="signature" label="Подпись" placeholder="Подпишите здесь" />
      </TestForm>,
    )

    expect(screen.getByText('Подпишите здесь')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Область подписи' })).toBeInTheDocument()
  })

  it('переключение в typed mode показывает текстовый инпут', () => {
    render(
      <TestForm defaultValues={{ signature: '' }}>
        <FieldSignature name="signature" label="Подпись" />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: /ввести текст/i }))
    expect(screen.getByPlaceholderText('Введите ваше имя...')).toBeInTheDocument()
  })

  it('без allowTyped кнопки переключения режима не рендерятся', () => {
    render(
      <TestForm defaultValues={{ signature: '' }}>
        <FieldSignature name="signature" label="Подпись" allowTyped={false} />
      </TestForm>,
    )

    expect(screen.queryByRole('button', { name: /ввести текст/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /рисовать/i })).not.toBeInTheDocument()
  })

  it('кнопка очистки скрыта, пока подпись пуста', () => {
    render(
      <TestForm defaultValues={{ signature: '' }}>
        <FieldSignature name="signature" label="Подпись" />
      </TestForm>,
    )

    expect(screen.queryByRole('button', { name: /очистить/i })).not.toBeInTheDocument()
  })

  it('ввод текста в typed mode вызывает field.handleChange', () => {
    render(
      <TestForm defaultValues={{ signature: '' }}>
        <FieldSignature name="signature" label="Подпись" />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('button', { name: /ввести текст/i }))
    const input = screen.getByPlaceholderText('Введите ваше имя...')
    fireEvent.change(input, { target: { value: 'Иван Иванов' } })
    expect(input).toHaveValue('Иван Иванов')
  })
})
