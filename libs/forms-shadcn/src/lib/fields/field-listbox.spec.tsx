import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldListbox } from './field-listbox'

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
]

const groupedOptions = [
  { label: 'TypeScript', value: 'ts', group: 'Frontend' },
  { label: 'Python', value: 'py', group: 'Backend' },
]

describe('FieldListbox (shadcn)', () => {
  it('рендерит все опции сразу (без выпадающего списка)', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldListbox name="framework" label="Фреймворк" options={options} />
      </TestForm>,
    )

    expect(screen.getByText('Фреймворк')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('single режим: клик выбирает опцию, повторный клик снимает выбор', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldListbox name="framework" options={options} />
      </TestForm>,
    )

    const reactOption = screen.getByRole('option', { name: 'React' })
    fireEvent.click(reactOption)
    expect(reactOption).toHaveAttribute('aria-selected', 'true')

    fireEvent.click(reactOption)
    expect(reactOption).toHaveAttribute('aria-selected', 'false')
  })

  it('single режим: выбор другой опции снимает предыдущую', () => {
    render(
      <TestForm defaultValues={{ framework: 'react' }}>
        <FieldListbox name="framework" options={options} />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('option', { name: 'Vue' }))

    expect(screen.getByRole('option', { name: 'React' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('option', { name: 'Vue' })).toHaveAttribute('aria-selected', 'true')
  })

  it('multiple режим: несколько опций выбираются независимо', () => {
    render(
      <TestForm defaultValues={{ features: [] as string[] }}>
        <FieldListbox name="features" options={options} selectionMode="multiple" />
      </TestForm>,
    )

    fireEvent.click(screen.getByRole('option', { name: 'React' }))
    fireEvent.click(screen.getByRole('option', { name: 'Vue' }))

    expect(screen.getByRole('option', { name: 'React' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Vue' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Angular' })).toHaveAttribute('aria-selected', 'false')
  })

  it('группировка через group рендерит заголовки групп', () => {
    render(
      <TestForm defaultValues={{ language: '' }}>
        <FieldListbox name="language" options={groupedOptions} />
      </TestForm>,
    )

    expect(screen.getByText('Frontend')).toBeInTheDocument()
    expect(screen.getByText('Backend')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'TypeScript' })).toBeInTheDocument()
  })

  it('disabled опция не переключается кликом', () => {
    render(
      <TestForm defaultValues={{ framework: '' }}>
        <FieldListbox name="framework" options={[{ label: 'React', value: 'react', disabled: true }]} />
      </TestForm>,
    )

    const opt = screen.getByRole('option', { name: 'React' })
    fireEvent.click(opt)
    expect(opt).toHaveAttribute('aria-selected', 'false')
  })

  // @ts-expect-error — selectionMode обязан быть 'single' | 'multiple', негативный контроль
  const _typeCheck = <FieldListbox name="framework" options={options} selectionMode="triple" />
})
