import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'
import { FieldSelect, resetSelectSearchWarning } from './field-select'

const options = Array.from({ length: 12 }, (_, i) => ({
  label: i === 1 ? 'Привет' : `Работа ${i}`,
  value: `v${i}`,
}))

beforeAll(() => {
  // Radix Select опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  resetSelectSearchWarning()
  vi.restoreAllMocks()
})

const renderSelect = (props: Record<string, unknown> = {}) =>
  render(
    <TestForm defaultValues={{ cat: 'v3' }}>
      <FieldSelect name="cat" options={options} {...props} />
    </TestForm>,
  )

describe('FieldSelect (shadcn) — searchable', () => {
  it("'auto', false и отсутствие пропа не предупреждают", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderSelect()
    renderSelect({ searchable: 'auto' })
    renderSelect({ searchable: false })
    expect(warn).not.toHaveBeenCalled()
  })

  it('true и объект — одно предупреждение на процесс', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    renderSelect({ searchable: true })
    renderSelect({ searchable: { threshold: 3 } })
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1))
    expect(String(warn.mock.calls[0]![0])).toContain('searchable')
  })

  it('поля поиска в списке нет даже при 12 опциях', async () => {
    renderSelect({ searchable: true })
    fireEvent.pointerDown(screen.getByRole('combobox'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
    await screen.findByRole('option', { name: 'Привет' })
    expect(document.querySelector('input[role="combobox"]')).toBeNull()
  })
})

describe('FieldCombobox (shadcn) — раскладка', () => {
  it('«ghbdtn» находит «Привет»', async () => {
    render(
      <TestForm defaultValues={{ cat: '' }}>
        <FieldCombobox name="cat" options={options} />
      </TestForm>,
    )
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'ghbdtn' } })
    await screen.findByRole('option', { name: 'Привет' })
    expect(screen.queryByRole('option', { name: 'Работа 3' })).toBeNull()
  })
})
