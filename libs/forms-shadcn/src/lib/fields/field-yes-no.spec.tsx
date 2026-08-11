import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FieldYesNo } from './field-yes-no'

describe('FieldYesNo (shadcn)', () => {
  it('рендерит с меткой и обеими опциями', () => {
    render(
      <TestForm defaultValues={{ agree: undefined }}>
        <FieldYesNo name="agree" label="Вы согласны?" />
      </TestForm>,
    )

    expect(screen.getByText('Вы согласны?')).toBeInTheDocument()
    expect(screen.getByText('Да')).toBeInTheDocument()
    expect(screen.getByText('Нет')).toBeInTheDocument()
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(2)
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('выбирает "Да" по клику', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ agree: undefined }}>
        <FieldYesNo name="agree" label="Вы согласны?" />
      </TestForm>,
    )

    await user.click(screen.getByText('Да'))
    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')
    expect(radios[1]).toHaveAttribute('aria-checked', 'false')
  })

  it('переключает с "Да" на "Нет"', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ agree: true }}>
        <FieldYesNo name="agree" label="Вы согласны?" />
      </TestForm>,
    )

    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toHaveAttribute('aria-checked', 'true')

    await user.click(screen.getByText('Нет'))
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
    expect(radios[1]).toHaveAttribute('aria-checked', 'true')
  })

  it('кастомные лейблы и вариант emoji', () => {
    render(
      <TestForm defaultValues={{ agree: undefined }}>
        <FieldYesNo name="agree" label="Согласны?" yesLabel="Согласен" noLabel="Отказ" variant="emoji" />
      </TestForm>,
    )

    expect(screen.getByText('Согласен')).toBeInTheDocument()
    expect(screen.getByText('Отказ')).toBeInTheDocument()
    expect(screen.getByText('😊')).toBeInTheDocument()
    expect(screen.getByText('😞')).toBeInTheDocument()
  })

  it('disabled блокирует выбор', async () => {
    const user = userEvent.setup()
    render(
      <TestForm defaultValues={{ agree: undefined }}>
        <FieldYesNo name="agree" label="Вы согласны?" disabled />
      </TestForm>,
    )

    const radios = screen.getAllByRole('radio')
    expect(radios[0]).toBeDisabled()
    await user.click(screen.getByText('Да'))
    expect(radios[0]).toHaveAttribute('aria-checked', 'false')
  })

  // Негативный контроль типов
  it('типы: variant принимает только допустимые значения', () => {
    // @ts-expect-error variant должен быть 'buttons' | 'thumbs' | 'emoji'
    const invalid: import('./types').YesNoFieldProps = { variant: 'bogus' }
    expect(invalid).toBeDefined()
  })
})
