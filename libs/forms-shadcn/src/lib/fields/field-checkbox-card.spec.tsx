import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCheckboxCard } from './field-checkbox-card'

const options = [
  { label: 'TypeScript', value: 'ts', description: 'Type safety' },
  { label: 'ESLint', value: 'eslint', description: 'Code quality' },
  { label: 'Prettier', value: 'prettier' },
]

describe('FieldCheckboxCard (shadcn)', () => {
  it('рендерит карточки с label и description', () => {
    render(
      <TestForm defaultValues={{ features: [] as string[] }}>
        <FieldCheckboxCard name="features" label="Фичи" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Фичи')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
    expect(screen.getByText('Type safety')).toBeInTheDocument()
  })

  it('несколько карточек выбираются независимо', () => {
    render(
      <TestForm defaultValues={{ features: [] as string[] }}>
        <FieldCheckboxCard name="features" options={options} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /TypeScript/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /Prettier/ }))

    expect(screen.getByRole('checkbox', { name: /TypeScript/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: /Prettier/ })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('checkbox', { name: /ESLint/ })).toHaveAttribute('aria-checked', 'false')
  })

  it('повторный клик снимает выбор', () => {
    render(
      <TestForm defaultValues={{ features: ['ts'] }}>
        <FieldCheckboxCard name="features" options={options} />
      </TestForm>,
    )

    const card = screen.getByRole('checkbox', { name: /TypeScript/ })
    expect(card).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-checked', 'false')
  })

  it('disabled карточка не переключается кликом', () => {
    render(
      <TestForm defaultValues={{ features: [] as string[] }}>
        <FieldCheckboxCard name="features" options={[{ label: 'TypeScript', value: 'ts', disabled: true }]} />
      </TestForm>,
    )

    const card = screen.getByRole('checkbox', { name: 'TypeScript' })
    fireEvent.click(card)
    expect(card).toHaveAttribute('aria-checked', 'false')
  })

  // @ts-expect-error — orientation обязан быть 'horizontal' | 'vertical', негативный контроль
  const _typeCheck = <FieldCheckboxCard name="features" options={options} orientation="diagonal" />
})
