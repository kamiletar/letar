import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldSelect } from './field-select'

beforeAll(() => {
  // Radix Select опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

const renderSelect = (props: Record<string, unknown>, value = '') =>
  render(
    <TestForm defaultValues={{ cat: value }}>
      <FieldSelect name="cat" placeholder="Выберите" {...props} />
    </TestForm>,
  )

describe('FieldSelect (shadcn) — loading', () => {
  it('без loading текста загрузки нет', () => {
    renderSelect({ options: [{ label: 'Кровля', value: 'a' }] }, 'a')
    expect(screen.getByRole('combobox')).toHaveTextContent('Кровля')
    expect(document.querySelector('.animate-spin')).toBeNull()
  })

  it('loading: спиннер в поле', () => {
    renderSelect({ options: [], loading: true })
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('loading + значение без опции: в триггере «Загрузка...» вместо placeholder', () => {
    renderSelect({ options: [], loading: true }, 'a')
    expect(screen.getByRole('combobox')).toHaveTextContent('Загрузка...')
    expect(screen.getByRole('combobox')).not.toHaveTextContent('Выберите')
  })
})
