import { TestForm } from '@letar/forms-react/testing'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FieldCombobox } from './field-combobox'

// Клавиатурная навигация shadcn Combobox: стрелки, Enter, Escape, F2 (долг этапа Д)

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular', disabled: true },
  { label: 'Svelte', value: 'svelte' },
]

function setup(props: Record<string, unknown> = {}, initial = '') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- инстанс TanStack Form
  let form: any
  render(
    <TestForm defaultValues={{ framework: initial }} onFormReady={(f) => (form = f)}>
      <FieldCombobox name="framework" options={options} {...props} />
    </TestForm>,
  )
  return { values: () => form.state.values as { framework: string } }
}

const input = () => screen.getByRole('combobox') as HTMLInputElement
const highlightedText = () => document.querySelector('[role="option"][data-highlighted]')?.textContent

describe('FieldCombobox (shadcn) — клавиатура', () => {
  it('ArrowDown на закрытом списке открывает его', () => {
    setup()
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    expect(input()).toHaveAttribute('aria-expanded', 'true')
  })

  it('стрелки двигают подсветку, заблокированные пункты пропускаются, aria-activedescendant указывает на подсвеченный', () => {
    setup()
    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    expect(highlightedText()).toBe('React')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    expect(highlightedText()).toBe('Vue')
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    expect(highlightedText()).toBe('Svelte')
    const active = document.getElementById(input().getAttribute('aria-activedescendant')!)
    expect(active).toHaveTextContent('Svelte')
    // По кругу
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    expect(highlightedText()).toBe('React')
    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    expect(highlightedText()).toBe('Svelte')
  })

  it('Enter выбирает подсвеченный пункт и закрывает список', async () => {
    const { values } = setup()
    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'Enter' })

    expect(values().framework).toBe('vue')
    await waitFor(() => expect(input()).toHaveAttribute('aria-expanded', 'false'))
    expect(input().value).toBe('Vue')
  })

  it('Enter без подсвеченного пункта ничего не выбирает и не перехватывается', () => {
    const { values } = setup()
    fireEvent.focus(input())
    const notPrevented = fireEvent.keyDown(input(), { key: 'Enter' })
    expect(notPrevented).toBe(true)
    expect(values().framework).toBe('')
  })

  it('Escape закрывает список', async () => {
    setup()
    fireEvent.focus(input())
    expect(input()).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(input(), { key: 'Escape' })
    await waitFor(() => expect(input()).toHaveAttribute('aria-expanded', 'false'))
  })

  it('F2 на подсвеченном пункте зовёт onUpdate с этой записью', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'Vue 3', value: 'vue' })
    setup({ onUpdate })
    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'F2' })

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ value: 'vue', label: 'Vue' })
  })

  it('F2 на закрытом списке правит выбранное значение', async () => {
    const onUpdate = vi.fn().mockResolvedValue({ label: 'React 19', value: 'react' })
    setup({ onUpdate }, 'react')
    await waitFor(() => expect(input().value).toBe('React'))
    fireEvent.keyDown(input(), { key: 'Escape' })
    await waitFor(() => expect(input()).toHaveAttribute('aria-expanded', 'false'))

    fireEvent.keyDown(input(), { key: 'F2' })

    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    expect(onUpdate.mock.calls[0]![0]).toMatchObject({ value: 'react' })
  })

  it('без onUpdate F2 ничего не делает и подсказки нет', () => {
    setup()
    expect(input()).not.toHaveAttribute('aria-keyshortcuts')
    expect(fireEvent.keyDown(input(), { key: 'F2' })).toBe(true)
  })
})
