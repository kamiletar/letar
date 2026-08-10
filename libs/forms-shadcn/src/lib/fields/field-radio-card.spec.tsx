import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldRadioCard } from './field-radio-card'

const options = [
  { label: 'Free', value: 'free', description: 'Basic features' },
  { label: 'Pro', value: 'pro', description: 'All features' },
  { label: 'Enterprise', value: 'enterprise' },
]

describe('FieldRadioCard (shadcn)', () => {
  it('рендерит карточки с label и description', () => {
    render(
      <TestForm defaultValues={{ plan: '' }}>
        <FieldRadioCard name="plan" label="Тариф" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Тариф')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(3)
    expect(screen.getByText('Basic features')).toBeInTheDocument()
  })

  it('клик выбирает карточку', () => {
    render(
      <TestForm defaultValues={{ plan: '' }}>
        <FieldRadioCard name="plan" options={options} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('radio', { name: /Pro/ }))
    expect(screen.getByRole('radio', { name: /Pro/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('выбор одной карточки снимает выбор с предыдущей (single selection)', () => {
    render(
      <TestForm defaultValues={{ plan: 'free' }}>
        <FieldRadioCard name="plan" options={options} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('radio', { name: /Enterprise/ }))

    expect(screen.getByRole('radio', { name: /Free/ })).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByRole('radio', { name: /Enterprise/ })).toHaveAttribute('aria-checked', 'true')
  })

  it('disabled карточка не переключается кликом', () => {
    render(
      <TestForm defaultValues={{ plan: '' }}>
        <FieldRadioCard name="plan" options={[{ label: 'Free', value: 'free', disabled: true }]} />
      </TestForm>,
    )

    const card = screen.getByRole('radio', { name: 'Free' })
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-checked', 'false')
  })

  // @ts-expect-error — orientation обязан быть 'horizontal' | 'vertical', негативный контроль
  const _typeCheck = <FieldRadioCard name="plan" options={options} orientation="diagonal" />
})
