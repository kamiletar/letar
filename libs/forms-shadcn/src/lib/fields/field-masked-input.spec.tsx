import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FieldMaskedInput } from './field-masked-input'

describe('FieldMaskedInput (shadcn)', () => {
  it('рендерит formatDescription над input', () => {
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldMaskedInput name="code" label="Код" mask="999-999" formatDescription="Формат: 3 цифры, дефис, 3 цифры" />
      </TestForm>,
    )

    expect(screen.getByText('Формат: 3 цифры, дефис, 3 цифры')).toBeInTheDocument()
  })

  it('группирует ввод по маске', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldMaskedInput name="code" label="Код" mask="999-999" formatDescription="Формат: 3 цифры, дефис, 3 цифры" />
      </TestForm>,
    )

    const input = document.querySelector('input[data-field-name="code"]') as HTMLInputElement
    await user.type(input, '770001')

    expect(input.value).toBe('770-001')
  })

  it('без formatDescription выводит предупреждение в консоль (WCAG 3.3.2)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <TestForm defaultValues={{ code: '' }}>
        <FieldMaskedInput name="code" label="Код" mask="999-999" />
      </TestForm>,
    )

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('formatDescription'))
    spy.mockRestore()
  })
})
