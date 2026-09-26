import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { FieldSelect } from './field-select'

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
]

beforeAll(() => {
  // Radix Select опирается на API указателя и прокрутки, которых нет в jsdom
  Element.prototype.hasPointerCapture = vi.fn(() => false)
  Element.prototype.setPointerCapture = vi.fn()
  Element.prototype.releasePointerCapture = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

function setup(props: Record<string, unknown>, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ framework: initial }} onFormReady={(f) => (form = f)}>
      <FieldSelect name="framework" options={options} {...props} />
    </TestForm>,
  )
  return { values: () => form.state.values as { framework: string } }
}

function openSelect() {
  fireEvent.pointerDown(screen.getByRole('combobox'), { button: 0, ctrlKey: false, pointerType: 'mouse' })
}

describe('FieldSelect (shadcn) — onCreate', () => {
  it('без onCreate пункта «Добавить…» нет', async () => {
    setup({})
    openSelect()
    expect(await screen.findByRole('option', { name: 'Vue' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Добавить/ })).not.toBeInTheDocument()
  })

  it('с onCreate в конце списка есть «+ Добавить…»', async () => {
    setup({ onCreate: vi.fn() })
    openSelect()
    expect(await screen.findByRole('option', { name: '+ Добавить…' })).toBeInTheDocument()
  })

  it('выбор пункта вызывает onCreate, созданная опция выбирается', async () => {
    const onCreate = vi.fn().mockResolvedValue({ label: 'Solid', value: 'solid' })
    const { values } = setup({ onCreate })
    openSelect()
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith('', expect.anything()))
    await waitFor(() => expect(values().framework).toBe('solid'))
  })

  it('onCreate вернул null — значение не меняется', async () => {
    const onCreate = vi.fn().mockResolvedValue(null)
    const { values } = setup({ onCreate }, 'react')
    openSelect()
    fireEvent.click(await screen.findByRole('option', { name: '+ Добавить…' }))

    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(values().framework).toBe('react')
  })
})
